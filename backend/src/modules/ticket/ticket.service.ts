import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';

import { Ticket, TicketType, TicketStatus, TicketBenefits } from '../../entities/ticket.entity';
import { Order, OrderStatus } from '../../entities/order.entity';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { User, MemberLevel } from '../../entities/user.entity';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';
import { MemberService } from '../../common/services/member.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(TicketUsageRecord)
    private usageRecordRepository: Repository<TicketUsageRecord>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private logService: LogService,
    private memberService: MemberService,
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

  private calculateExpireAt(validDays?: number): Date | null {
    if (!validDays) return null;
    return dayjs().add(validDays, 'day').toDate();
  }

  private getTicketPrice(ticketType: TicketType, dto: CreateOrderDto): number {
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

  private buildBenefits(createOrderDto: CreateOrderDto): TicketBenefits {
    const { benefits, memberLevel, memberDays } = createOrderDto;
    if (benefits) {
      return benefits;
    }
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

  async createOrder(
    createOrderDto: CreateOrderDto,
    userId: string,
    sellerId?: string,
    ip?: string,
  ): Promise<{ order: OrderResponseDto; ticket: TicketResponseDto }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { ticketType, ticketName, totalTimes, validDays, paymentMethod, isMemberExclusive, memberLevel, memberDays } = createOrderDto;

      if (ticketType === TicketType.TIMES_CARD && !totalTimes) {
        throw new BadRequestException('次卡必须指定总次数');
      }
      if (ticketType === TicketType.MONTHLY_CARD && !validDays) {
        throw new BadRequestException('月卡必须指定有效天数');
      }

      const benefits = this.buildBenefits(createOrderDto);

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      const price = this.getTicketPrice(ticketType, createOrderDto);
      const orderNo = this.generateOrderNo();
      const ticketId = uuidv4();
      const pickupCode = this.generatePickupCode();
      const expireAt = this.calculateExpireAt(
        ticketType === TicketType.MONTHLY_CARD ? validDays : undefined,
      );

      const ticket = queryRunner.manager.create(Ticket, {
        id: ticketId,
        type: ticketType,
        name: ticketName,
        price,
        totalTimes: ticketType === TicketType.TIMES_CARD ? totalTimes : undefined,
        usedTimes: 0,
        validDays: ticketType === TicketType.MONTHLY_CARD ? validDays : undefined,
        expireAt,
        status: TicketStatus.ACTIVE,
        isMemberExclusive: isMemberExclusive || false,
        benefits,
        pickupCode,
        userId,
      });

      await queryRunner.manager.save(Ticket, ticket);

      const qrCode = await this.generateQrCode(ticketId);
      ticket.qrCode = qrCode;
      await queryRunner.manager.save(Ticket, ticket);

      const order = queryRunner.manager.create(Order, {
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

      await queryRunner.commitTransaction();

      await this.logService.record(
        LogModule.TICKET,
        LogAction.CREATE,
        `创建订单: ${orderNo}, 票卡类型: ${ticketType}${isMemberExclusive ? ', 会员专属' : ''}`,
        sellerId || userId,
        { orderId: order.id, ticketId, orderNo, ticketType, amount: price, isMemberExclusive, memberLevel },
        ip,
      );

      return {
        order: this.toOrderResponseDto(order),
        ticket: this.toTicketResponseDto(ticket),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyTicket(
    verifyTicketDto: VerifyTicketDto,
    operatorId?: string,
    ip?: string,
  ): Promise<{ ticket: TicketResponseDto; record: TicketUsageRecord }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { ticketId, qrCode, pickupCode, lockerId } = verifyTicketDto;

      let ticket: Ticket | null = null;

      if (ticketId) {
        ticket = await queryRunner.manager.findOne(Ticket, {
          where: { id: ticketId },
          lock: { mode: 'pessimistic_write' },
        });
      } else if (qrCode) {
        ticket = await queryRunner.manager.findOne(Ticket, {
          where: { qrCode },
          lock: { mode: 'pessimistic_write' },
        });
      } else if (pickupCode) {
        ticket = await queryRunner.manager.findOne(Ticket, {
          where: { pickupCode },
          lock: { mode: 'pessimistic_write' },
        });
      }

      if (!ticket) {
        throw new NotFoundException('票卡不存在');
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

      const usageRecord = queryRunner.manager.create(TicketUsageRecord, {
        ticketId: ticket.id,
        userId: ticket.userId,
        lockerId,
        timesUsed,
        checkInAt: new Date(),
      });

      await queryRunner.manager.save(TicketUsageRecord, usageRecord);

      await queryRunner.commitTransaction();

      await this.logService.record(
        LogModule.TICKET,
        LogAction.USE,
        `核销票卡: ${ticket.name}`,
        operatorId,
        {
          ticketId: ticket.id,
          ticketType: ticket.type,
          usedTimes: ticket.usedTimes,
          recordId: usageRecord.id,
        },
        ip,
      );

      return {
        ticket: this.toTicketResponseDto(ticket),
        record: usageRecord,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyTickets(
    userId: string,
    queryTicketDto: QueryTicketDto,
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    const { type, status, page = 1, pageSize = 10 } = queryTicketDto;

    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket');
    queryBuilder.where('ticket.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('ticket.type = :type', { type });
    }
    if (status) {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    queryBuilder.orderBy('ticket.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list: list.map((ticket) => this.toTicketResponseDto(ticket)),
      total,
      page,
      pageSize,
    };
  }

  async getTicketDetail(ticketId: string, userId?: string): Promise<TicketResponseDto> {
    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket');
    queryBuilder.where('ticket.id = :ticketId', { ticketId });

    if (userId) {
      queryBuilder.andWhere('ticket.userId = :userId', { userId });
    }

    const ticket = await queryBuilder.getOne();

    if (!ticket) {
      throw new NotFoundException('票卡不存在');
    }

    return this.toTicketResponseDto(ticket);
  }

  async getOrderList(
    queryOrderDto: QueryOrderDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { status, ticketType, page = 1, pageSize = 10 } = queryOrderDto;

    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId });
    }
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }
    if (ticketType) {
      queryBuilder.andWhere('order.ticketType = :ticketType', { ticketType });
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list: list.map((order) => this.toOrderResponseDto(order)),
      total,
      page,
      pageSize,
    };
  }

  async getOrderDetail(orderId: string, userId?: string): Promise<OrderResponseDto> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');
    queryBuilder.where('order.id = :orderId', { orderId });

    if (userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId });
    }

    const order = await queryBuilder.getOne();

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return this.toOrderResponseDto(order);
  }

  async getTicketUsageRecords(ticketId: string): Promise<TicketUsageRecord[]> {
    return this.usageRecordRepository.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
  }

  private toTicketResponseDto(ticket: Ticket): TicketResponseDto {
    return {
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
    };
  }

  private toOrderResponseDto(order: Order): OrderResponseDto {
    return {
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
    };
  }
}
