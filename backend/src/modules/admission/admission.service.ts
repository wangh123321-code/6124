import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import * as QRCode from 'qrcode';

import { Ticket, TicketType, TicketStatus, TicketBenefits } from '../../entities/ticket.entity';
import { Order, OrderStatus } from '../../entities/order.entity';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { User, MemberLevel } from '../../entities/user.entity';
import { Locker, LockerStatus, LockerZone } from '../../entities/locker.entity';
import { LockerLog, LockerLogAction } from '../../entities/locker-log.entity';
import { MemberService, VIP_ZONES, VIP_MAX_POSITION } from '../../common/services/member.service';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';

import { CheckInDto } from './dto/check-in.dto';
import { CheckInResponseDto } from './dto/check-in-response.dto';

@Injectable()
export class AdmissionService {
  constructor(
    private dataSource: DataSource,
    private memberService: MemberService,
    private logService: LogService,
  ) {}

  private generatePickupCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateOrderNo(): string {
    const now = dayjs().format('YYYYMMDDHHmmss');
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    return `TK${now}${random}`;
  }

  private async generateQrCode(ticketId: string): Promise<string> {
    const qrData = JSON.stringify({
      ticketId,
      timestamp: Date.now(),
    });
    return QRCode.toDataURL(qrData);
  }

  private getTicketPrice(ticketType: TicketType, dto: CheckInDto): number {
    if (dto.amount !== undefined && dto.amount !== null) {
      return dto.amount;
    }
    switch (ticketType) {
      case TicketType.SINGLE:
        return 30;
      case TicketType.TIMES_CARD:
        return 270;
      case TicketType.MONTHLY_CARD:
        return 500;
      default:
        return 0;
    }
  }

  private buildBenefits(dto: CheckInDto): TicketBenefits {
    const { memberLevel, memberDays } = dto;
    if (memberLevel) {
      const privilege = this.memberService.getPrivilege(memberLevel);
      return {
        memberLevel,
        memberDays: memberDays || 30,
        freeLockerHours: privilege.freeLockerHours,
        vipLockerAccess: privilege.vipLockerAccess,
      };
    }
    return {};
  }

  private calculateMemberExpireAt(currentExpireAt: Date | null, memberDays: number): Date {
    const now = dayjs();
    if (currentExpireAt && dayjs(currentExpireAt).isAfter(now)) {
      return dayjs(currentExpireAt).add(memberDays, 'day').toDate();
    }
    return now.add(memberDays, 'day').toDate();
  }

  private async findAvailableLocker(
    user: User,
    queryRunner: QueryRunner,
  ): Promise<Locker | null> {
    const effectiveLevel = user.memberLevel;
    const isVipMember = this.memberService.isVipMember(effectiveLevel);

    if (isVipMember) {
      for (const zone of VIP_ZONES) {
        const locker = await queryRunner.manager
          .createQueryBuilder(Locker, 'locker')
          .where('locker.zone = :zone', { zone })
          .andWhere('locker.position <= :maxPos', { maxPos: VIP_MAX_POSITION })
          .andWhere('locker.status = :status', { status: LockerStatus.FREE })
          .orderBy('locker.position', 'ASC')
          .setLock('pessimistic_write')
          .getOne();

        if (locker) {
          return locker;
        }
      }
    }

    const normalZones = this.memberService.getNormalZones();

    for (const zone of normalZones) {
      const locker = await queryRunner.manager
        .createQueryBuilder(Locker, 'locker')
        .where('locker.zone = :zone', { zone })
        .andWhere('locker.status = :status', { status: LockerStatus.FREE })
        .orderBy('locker.position', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (locker) {
        return locker;
      }
    }

    return null;
  }

  async checkIn(
    dto: CheckInDto,
    userId: string,
    sellerId?: string,
    ip?: string,
  ): Promise<CheckInResponseDto> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      let ticket: Ticket | null = null;
      let order: Order | null = null;
      let usageRecord: TicketUsageRecord | null = null;
      let locker: Locker | null = null;

      if (dto.ticketId || dto.ticketQrCode || dto.ticketPickupCode) {
        const ticketQuery: any = {};
        if (dto.ticketId) ticketQuery.id = dto.ticketId;
        if (dto.ticketQrCode) ticketQuery.qrCode = dto.ticketQrCode;
        if (dto.ticketPickupCode) ticketQuery.pickupCode = dto.ticketPickupCode;

        ticket = await queryRunner.manager.findOne(Ticket, {
          where: ticketQuery,
          lock: { mode: 'pessimistic_write' },
        });

        if (!ticket) {
          throw new NotFoundException('票卡不存在');
        }
        if (ticket.userId !== userId) {
          throw new BadRequestException('该票卡不属于当前用户');
        }
        if (ticket.status !== TicketStatus.ACTIVE) {
          throw new BadRequestException(`票卡状态异常: ${ticket.status}`);
        }

        const isExpired = ticket.expireAt && dayjs().isAfter(ticket.expireAt);
        if (isExpired && ticket.type === TicketType.MONTHLY_CARD) {
          ticket.status = TicketStatus.EXPIRED;
          await queryRunner.manager.save(Ticket, ticket);
          throw new BadRequestException('月卡已过期');
        }

        let timesUsed = 1;
        switch (ticket.type) {
          case TicketType.SINGLE:
            if (ticket.usedTimes >= 1) {
              throw new BadRequestException('单次票已使用');
            }
            ticket.usedTimes += 1;
            ticket.status = TicketStatus.USED_UP;
            break;
          case TicketType.TIMES_CARD:
            if (ticket.usedTimes >= (ticket.totalTimes || 0)) {
              ticket.status = TicketStatus.USED_UP;
              await queryRunner.manager.save(Ticket, ticket);
              throw new BadRequestException('次卡次数已用完');
            }
            ticket.usedTimes += 1;
            if (ticket.usedTimes >= (ticket.totalTimes || 0)) {
              ticket.status = TicketStatus.USED_UP;
            }
            break;
          case TicketType.MONTHLY_CARD:
            ticket.usedTimes += 1;
            break;
        }
        await queryRunner.manager.save(Ticket, ticket);

        usageRecord = queryRunner.manager.create(TicketUsageRecord, {
          ticketId: ticket.id,
          userId: ticket.userId,
          timesUsed,
          checkInAt: new Date(),
        });
        await queryRunner.manager.save(TicketUsageRecord, usageRecord);
      } else if (dto.ticketType && dto.ticketName) {
        const { ticketType, ticketName, totalTimes, validDays, paymentMethod, isMemberExclusive, memberLevel, memberDays } = dto;

        if (ticketType === TicketType.TIMES_CARD && !totalTimes) {
          throw new BadRequestException('次卡必须指定总次数');
        }
        if (ticketType === TicketType.MONTHLY_CARD && !validDays) {
          throw new BadRequestException('月卡必须指定有效天数');
        }

        const benefits = this.buildBenefits(dto);
        const price = this.getTicketPrice(ticketType, dto);
        const orderNo = this.generateOrderNo();
        const ticketId = uuidv4();
        const pickupCode = this.generatePickupCode();
        const expireAt = ticketType === TicketType.MONTHLY_CARD
          ? dayjs().add(validDays!, 'day').toDate()
          : null;

        ticket = queryRunner.manager.create(Ticket, {
          id: ticketId,
          type: ticketType,
          name: ticketName,
          price,
          totalTimes: ticketType === TicketType.TIMES_CARD ? totalTimes : undefined,
          usedTimes: 1,
          validDays: ticketType === TicketType.MONTHLY_CARD ? validDays : undefined,
          expireAt,
          status: ticketType === TicketType.SINGLE ? TicketStatus.USED_UP : TicketStatus.ACTIVE,
          isMemberExclusive: isMemberExclusive || false,
          benefits,
          pickupCode,
          userId,
        });
        await queryRunner.manager.save(Ticket, ticket);

        const qrCode = await this.generateQrCode(ticketId);
        ticket.qrCode = qrCode;
        await queryRunner.manager.save(Ticket, ticket);

        order = queryRunner.manager.create(Order, {
          orderNo,
          amount: price,
          status: OrderStatus.PAID,
          ticketType,
          ticketName,
          memberBenefits: benefits,
          extendedFields: {
            isMemberExclusive: isMemberExclusive || false,
            originalMemberLevel: user.memberLevel,
          },
          userId,
          ticketId,
          sellerId,
          paymentMethod: paymentMethod || 'cash',
        });
        await queryRunner.manager.save(Order, order);

        if (isMemberExclusive && memberLevel) {
          const privilege = this.memberService.getPrivilege(memberLevel);
          const days = memberDays || 30;

          user.memberLevel = this.memberService.isHigherLevel(memberLevel, user.memberLevel)
            ? memberLevel
            : user.memberLevel;
          user.memberExpireAt = this.calculateMemberExpireAt(user.memberExpireAt || null, days);

          await queryRunner.manager.save(User, user);

          order.extendedFields = {
            ...order.extendedFields,
            newMemberLevel: user.memberLevel,
            memberExpireAt: user.memberExpireAt,
            freeLockerHours: privilege.freeLockerHours,
            vipLockerAccess: privilege.vipLockerAccess,
          };
          await queryRunner.manager.save(Order, order);
        }

        usageRecord = queryRunner.manager.create(TicketUsageRecord, {
          ticketId: ticket.id,
          userId: ticket.userId,
          timesUsed: 1,
          checkInAt: new Date(),
        });
        await queryRunner.manager.save(TicketUsageRecord, usageRecord);
      } else {
        throw new BadRequestException('请提供票卡信息或选择票种购票');
      }

      if (dto.allocateLocker !== false) {
        locker = await this.findAvailableLocker(user, queryRunner);
        if (locker) {
          locker.status = LockerStatus.IN_USE;
          locker.usedAt = new Date();
          locker.currentUserId = userId;
          locker.isOverdueReminded = false;
          locker.pickupCode = this.generatePickupCode();
          locker.ticketId = ticket.id;
          locker.version = locker.version + 1;
          await queryRunner.manager.save(Locker, locker);

          usageRecord.lockerId = locker.id;
          await queryRunner.manager.save(TicketUsageRecord, usageRecord);

          const lockerLog = queryRunner.manager.create(LockerLog, {
            action: LockerLogAction.OPEN,
            lockerId: locker.id,
            operatorId: userId,
            openMethod: 'ticket',
            remark: `入场自动分配柜子，会员等级: ${user.memberLevel}`,
          });
          await queryRunner.manager.save(LockerLog, lockerLog);
        } else {
          throw new BadRequestException('暂无可用储物柜，无法完成入场');
        }
      }

      await queryRunner.commitTransaction();

      await this.logService.record(
        LogModule.TICKET,
        LogAction.USE,
        `用户入场: ${user.name}，票卡: ${ticket.name}${locker ? `，分配柜子: ${locker.lockerNo}` : ''}`,
        sellerId || userId,
        {
          ticketId: ticket.id,
          ticketType: ticket.type,
          lockerId: locker?.id,
          lockerNo: locker?.lockerNo,
          memberLevel: user.memberLevel,
        },
        ip,
      );

      return {
        success: true,
        ticket: {
          id: ticket.id,
          type: ticket.type,
          name: ticket.name,
          price: parseFloat(ticket.price as any),
          totalTimes: ticket.totalTimes,
          usedTimes: ticket.usedTimes,
          validDays: ticket.validDays,
          expireAt: ticket.expireAt,
          status: ticket.status,
          isMemberExclusive: ticket.isMemberExclusive,
          benefits: ticket.benefits,
          extendedFields: ticket.extendedFields,
          qrCode: ticket.qrCode,
          pickupCode: ticket.pickupCode,
          userId: ticket.userId,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
        order: order ? {
          id: order.id,
          orderNo: order.orderNo,
          amount: parseFloat(order.amount as any),
          status: order.status,
          ticketType: order.ticketType,
          ticketName: order.ticketName,
          memberBenefits: order.memberBenefits,
          extendedFields: order.extendedFields,
          userId: order.userId,
          ticketId: order.ticketId,
          sellerId: order.sellerId,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
        } : undefined,
        usageRecord,
        locker: locker || undefined,
        message: locker
          ? `入场成功，已为您分配${locker.zone}区${locker.lockerNo}号储物柜`
          : '入场成功',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
