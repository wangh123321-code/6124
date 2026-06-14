import { Injectable, OnModuleInit, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, QueryRunner } from 'typeorm';
import * as dayjs from 'dayjs';
import { Locker, LockerStatus, LockerZone } from '../../entities/locker.entity';
import { LockerLog, LockerLogAction } from '../../entities/locker-log.entity';
import { User, MemberLevel } from '../../entities/user.entity';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';
import { MemberService, VIP_ZONES, VIP_MAX_POSITION } from '../../common/services/member.service';
import { OpenLockerDto, OpenMethod } from './dto/open-locker.dto';
import { CloseLockerDto } from './dto/close-locker.dto';
import { ReserveLockerDto } from './dto/reserve-locker.dto';
import { ForceClearDto } from './dto/force-clear.dto';
import { SetFaultyDto } from './dto/set-faulty.dto';
import { RepairLockerDto } from './dto/repair-locker.dto';
import { LockerQueryDto } from './dto/locker-query.dto';
import { LockerStatisticsDto, ZoneStatisticsDto, VipComparisonDto } from './dto/locker-statistics.dto';
import { LockerGateway } from '../../gateways/locker.gateway';

const OVERDUE_REMIND_HOURS = 4;
const FORCE_CLEAR_HOURS = 24;
const LOCKERS_PER_ZONE = 100;

@Injectable()
export class LockerService implements OnModuleInit {
  constructor(
    @InjectRepository(Locker)
    private lockerRepo: Repository<Locker>,
    @InjectRepository(LockerLog)
    private lockerLogRepo: Repository<LockerLog>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    private dataSource: DataSource,
    private logService: LogService,
    private memberService: MemberService,
    private lockerGateway: LockerGateway,
  ) {}

  async onModuleInit() {
    await this.initLockers();
  }

  async initLockers() {
    const count = await this.lockerRepo.count();
    if (count > 0) {
      return;
    }

    const zones = [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D];
    const lockers: Locker[] = [];

    for (const zone of zones) {
      for (let i = 1; i <= LOCKERS_PER_ZONE; i++) {
        const lockerNo = `${zone}${i.toString().padStart(3, '0')}`;
        const locker = this.lockerRepo.create({
          lockerNo,
          zone,
          position: i,
          status: LockerStatus.FREE,
          version: 0,
        });
        lockers.push(locker);
      }
    }

    await this.lockerRepo.save(lockers);
  }

  async findAll(query: LockerQueryDto): Promise<Locker[]> {
    const where: any = {};
    if (query.zone) {
      where.zone = query.zone;
    }
    if (query.status) {
      where.status = query.status;
    }
    return this.lockerRepo.find({
      where,
      order: { zone: 'ASC', position: 'ASC' },
    });
  }

  async findByLockerNo(lockerNo: string): Promise<Locker> {
    const locker = await this.lockerRepo.findOne({ where: { lockerNo } });
    if (!locker) {
      throw new NotFoundException('柜子不存在');
    }
    return locker;
  }

  async findByZone(zone: LockerZone): Promise<Locker[]> {
    return this.lockerRepo.find({
      where: { zone },
      order: { position: 'ASC' },
    });
  }

  async getStatistics(): Promise<LockerStatisticsDto> {
    const [total, free, inUse, reserved, faulty] = await Promise.all([
      this.lockerRepo.count(),
      this.lockerRepo.count({ where: { status: LockerStatus.FREE } }),
      this.lockerRepo.count({ where: { status: LockerStatus.IN_USE } }),
      this.lockerRepo.count({ where: { status: LockerStatus.RESERVED } }),
      this.lockerRepo.count({ where: { status: LockerStatus.FAULTY } }),
    ]);

    const overdueCount = await this.lockerRepo
      .createQueryBuilder('locker')
      .where('locker.status = :status', { status: LockerStatus.IN_USE })
      .andWhere('locker.usedAt <= :overdueTime', {
        overdueTime: new Date(Date.now() - OVERDUE_REMIND_HOURS * 60 * 60 * 1000),
      })
      .andWhere('locker.isOverdueReminded = :reminded', { reminded: false })
      .getCount();

    return {
      total,
      free,
      inUse,
      reserved,
      faulty,
      overdue: overdueCount,
    };
  }

  async getZoneStatistics(): Promise<ZoneStatisticsDto[]> {
    const zones = [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D];
    const result: ZoneStatisticsDto[] = [];

    for (const zone of zones) {
      const [total, free, inUse, reserved, faulty] = await Promise.all([
        this.lockerRepo.count({ where: { zone } }),
        this.lockerRepo.count({ where: { zone, status: LockerStatus.FREE } }),
        this.lockerRepo.count({ where: { zone, status: LockerStatus.IN_USE } }),
        this.lockerRepo.count({ where: { zone, status: LockerStatus.RESERVED } }),
        this.lockerRepo.count({ where: { zone, status: LockerStatus.FAULTY } }),
      ]);

      result.push({
        zone,
        total,
        free,
        inUse,
        reserved,
        faulty,
      });
    }

    return result;
  }

  async openLocker(dto: OpenLockerDto, userId: string): Promise<Locker> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const locker = await queryRunner.manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status === LockerStatus.FAULTY) {
        throw new BadRequestException('柜子故障，无法打开');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      let ticket: Ticket | null = null;
      if (dto.openMethod === OpenMethod.TICKET) {
        ticket = await this.findTicket(dto, queryRunner);
        if (!ticket) {
          throw new BadRequestException('票据不存在或无效');
        }
        if (ticket.status !== TicketStatus.ACTIVE) {
          throw new BadRequestException(`票据状态异常: ${ticket.status}`);
        }
        if (ticket.userId !== userId) {
          throw new ForbiddenException('该票据不属于当前用户');
        }
      }

      if (dto.openMethod === OpenMethod.PICKUP_CODE) {
        if (!dto.pickupCode) {
          throw new BadRequestException('请输入取件码');
        }
        if (locker.pickupCode !== dto.pickupCode) {
          throw new BadRequestException('取件码错误');
        }
      }

      if (locker.status === LockerStatus.FREE || locker.status === LockerStatus.RESERVED) {
        await this.validateLockerAccess(user, locker, queryRunner);

        locker.status = LockerStatus.IN_USE;
        locker.usedAt = new Date();
        locker.currentUserId = userId;
        locker.isOverdueReminded = false;
        locker.pickupCode = this.generatePickupCode();
        if (ticket) {
          locker.ticketId = ticket.id;
        }
      } else if (locker.status === LockerStatus.IN_USE && locker.currentUserId === userId) {
      } else if (locker.status === LockerStatus.IN_USE && locker.currentUserId !== userId) {
        throw new BadRequestException('柜子正在被他人使用');
      }

      locker.version = locker.version + 1;

      const updatedLocker = await queryRunner.manager.save(locker);

      const openMethodText = dto.openMethod === OpenMethod.BLUETOOTH ? '蓝牙'
        : dto.openMethod === OpenMethod.TICKET ? '刷票'
        : '取件码';

      const log = queryRunner.manager.create(LockerLog, {
        action: LockerLogAction.OPEN,
        lockerId: locker.id,
        operatorId: userId,
        openMethod: dto.openMethod,
        remark: `使用${openMethodText}开柜，会员等级: ${this.getEffectiveMemberLevel(user)}`,
      });
      await queryRunner.manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.OPEN_LOCKER,
        `打开柜子 ${locker.lockerNo}`,
        userId,
        {
          lockerNo: locker.lockerNo,
          openMethod: dto.openMethod,
          memberLevel: this.getEffectiveMemberLevel(user),
          ticketId: ticket?.id,
        },
      );

      await queryRunner.commitTransaction();

      this.lockerGateway.broadcastLockerUpdate(updatedLocker);
      this.broadcastStats();

      return updatedLocker;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async closeLocker(dto: CloseLockerDto, userId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status !== LockerStatus.IN_USE) {
        throw new BadRequestException('柜子未在使用中');
      }

      locker.status = LockerStatus.FREE;
      locker.usedAt = null;
      locker.currentUserId = null;
      locker.isOverdueReminded = false;
      locker.pickupCode = null;
      locker.ticketId = null;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.CLOSE,
        lockerId: locker.id,
        operatorId: userId,
        remark: '关闭柜子',
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.CLOSE_LOCKER,
        `关闭柜子 ${locker.lockerNo}`,
        userId,
        { lockerNo: locker.lockerNo },
      );

      return updatedLocker;
    });
  }

  async reserveLocker(dto: ReserveLockerDto, userId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status !== LockerStatus.FREE) {
        throw new BadRequestException('柜子不可预留');
      }

      locker.status = LockerStatus.RESERVED;
      locker.currentUserId = userId;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.RESERVE,
        lockerId: locker.id,
        operatorId: userId,
        remark: '预留柜子',
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.OPEN_LOCKER,
        `预留柜子 ${locker.lockerNo}`,
        userId,
        { lockerNo: locker.lockerNo },
      );

      return updatedLocker;
    });
  }

  async cancelReserve(dto: ReserveLockerDto, userId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status !== LockerStatus.RESERVED) {
        throw new BadRequestException('柜子未被预留');
      }

      if (locker.currentUserId !== userId) {
        throw new ForbiddenException('无权取消他人预留');
      }

      locker.status = LockerStatus.FREE;
      locker.currentUserId = null;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.CANCEL_RESERVE,
        lockerId: locker.id,
        operatorId: userId,
        remark: '取消预留',
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.CLOSE_LOCKER,
        `取消预留柜子 ${locker.lockerNo}`,
        userId,
        { lockerNo: locker.lockerNo },
      );

      return updatedLocker;
    });
  }

  async forceClear(dto: ForceClearDto, adminId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status !== LockerStatus.IN_USE) {
        throw new BadRequestException('柜子未在使用中');
      }

      if (locker.usedAt) {
        const hoursUsed = (Date.now() - locker.usedAt.getTime()) / (1000 * 60 * 60);
        if (hoursUsed < FORCE_CLEAR_HOURS) {
          throw new BadRequestException(`使用未满${FORCE_CLEAR_HOURS}小时，不可强制清柜`);
        }
      }

      locker.status = LockerStatus.FREE;
      locker.usedAt = null;
      locker.currentUserId = null;
      locker.isOverdueReminded = false;
      locker.pickupCode = null;
      locker.ticketId = null;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.FORCE_CLEAR,
        lockerId: locker.id,
        operatorId: adminId,
        remark: dto.reason || '管理员强制清柜',
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.FORCE_CLEAR,
        `强制清柜 ${locker.lockerNo}`,
        adminId,
        { lockerNo: locker.lockerNo, reason: dto.reason },
      );

      return updatedLocker;
    });
  }

  async setFaulty(dto: SetFaultyDto, adminId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status === LockerStatus.FAULTY) {
        throw new BadRequestException('柜子已标记为故障');
      }

      const previousStatus = locker.status;

      locker.status = LockerStatus.FAULTY;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.SET_FAULTY,
        lockerId: locker.id,
        operatorId: adminId,
        remark: dto.remark || `标记故障，原状态：${previousStatus}`,
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.UPDATE,
        `标记柜子故障 ${locker.lockerNo}`,
        adminId,
        { lockerNo: locker.lockerNo, remark: dto.remark, previousStatus },
      );

      return updatedLocker;
    });
  }

  async repairLocker(dto: RepairLockerDto, adminId: string): Promise<Locker> {
    return this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status !== LockerStatus.FAULTY) {
        throw new BadRequestException('柜子不是故障状态');
      }

      locker.status = LockerStatus.FREE;
      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.REPAIR,
        lockerId: locker.id,
        operatorId: adminId,
        remark: dto.remark || '修复完成',
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.UPDATE,
        `修复柜子 ${locker.lockerNo}`,
        adminId,
        { lockerNo: locker.lockerNo, remark: dto.remark },
      );

      return updatedLocker;
    });
  }

  async checkOverdueAndRemind(): Promise<number> {
    const overdueTime = new Date(Date.now() - OVERDUE_REMIND_HOURS * 60 * 60 * 1000);

    const overdueLockers = await this.lockerRepo
      .createQueryBuilder('locker')
      .where('locker.status = :status', { status: LockerStatus.IN_USE })
      .andWhere('locker.usedAt <= :overdueTime', { overdueTime })
      .andWhere('locker.isOverdueReminded = :reminded', { reminded: false })
      .getMany();

    if (overdueLockers.length === 0) {
      return 0;
    }

    for (const locker of overdueLockers) {
      locker.isOverdueReminded = true;
      locker.version = locker.version + 1;
    }

    await this.lockerRepo.save(overdueLockers);

    return overdueLockers.length;
  }

  async getLockerLogs(lockerNo: string): Promise<LockerLog[]> {
    const locker = await this.findByLockerNo(lockerNo);
    return this.lockerLogRepo.find({
      where: { lockerId: locker.id },
      order: { createdAt: 'DESC' },
    });
  }

  private generatePickupCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isMemberExpired(user: User): boolean {
    if (!user.memberExpireAt) {
      return user.memberLevel !== MemberLevel.NORMAL;
    }
    const now = dayjs();
    const expireDate = dayjs(user.memberExpireAt).endOf('day');
    return now.isAfter(expireDate);
  }

  private getEffectiveMemberLevel(user: User): MemberLevel {
    if (this.isMemberExpired(user)) {
      return MemberLevel.NORMAL;
    }
    return user.memberLevel;
  }

  private async validateLockerAccess(
    user: User,
    locker: Locker,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const effectiveLevel = this.getEffectiveMemberLevel(user);
    const canAccess = this.memberService.canAccessZone(effectiveLevel, locker.zone, locker.position);

    if (!canAccess) {
      const isVipZone = this.memberService.isVipZone(locker.zone);
      if (isVipZone && locker.position <= VIP_MAX_POSITION) {
        throw new ForbiddenException(
          `该柜组为VIP专属区域（${locker.zone}区前${VIP_MAX_POSITION}号），请升级会员后使用，或前往C区、D区使用普通储物柜`,
        );
      }
      throw new ForbiddenException(`您的会员等级无权使用${locker.zone}区的储物柜`);
    }

    if (this.isMemberExpired(user) && user.memberLevel !== MemberLevel.NORMAL) {
      user.memberLevel = MemberLevel.NORMAL;
      user.memberExpireAt = null;
      await queryRunner.manager.save(User, user);
    }
  }

  private async findTicket(
    dto: OpenLockerDto,
    queryRunner: QueryRunner,
  ): Promise<Ticket | null> {
    if (dto.ticketId) {
      return queryRunner.manager.findOne(Ticket, {
        where: { id: dto.ticketId },
        lock: { mode: 'pessimistic_write' },
      });
    }
    if (dto.ticketQrCode) {
      return queryRunner.manager.findOne(Ticket, {
        where: { qrCode: dto.ticketQrCode },
        lock: { mode: 'pessimistic_write' },
      });
    }
    if (dto.ticketPickupCode) {
      return queryRunner.manager.findOne(Ticket, {
        where: { pickupCode: dto.ticketPickupCode },
        lock: { mode: 'pessimistic_write' },
      });
    }
    return null;
  }

  async findAvailableLocker(userId: string): Promise<Locker> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const effectiveLevel = this.getEffectiveMemberLevel(user);
    const isVipMember = this.memberService.isVipMember(effectiveLevel);

    return this.dataSource.transaction(async (manager) => {
      if (isVipMember) {
        for (const zone of VIP_ZONES) {
          const locker = await manager
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

      const normalZones = isVipMember
        ? [...VIP_ZONES, ...this.memberService.getNormalZones()]
        : this.memberService.getNormalZones();

      for (const zone of normalZones) {
        const positionQuery = isVipMember && VIP_ZONES.includes(zone)
          ? { positionQuery: 'locker.position > :minPos', minPos: VIP_MAX_POSITION }
          : { positionQuery: '1=1', minPos: 0 };

        const locker = await manager
          .createQueryBuilder(Locker, 'locker')
          .where('locker.zone = :zone', { zone })
          .andWhere(positionQuery.positionQuery, { minPos: positionQuery.minPos })
          .andWhere('locker.status = :status', { status: LockerStatus.FREE })
          .orderBy('locker.position', 'ASC')
          .setLock('pessimistic_write')
          .getOne();

        if (locker) {
          return locker;
        }
      }

      throw new BadRequestException('暂无可用储物柜');
    });
  }

  async handleMemberUpgrade(userId: string, newLevel: MemberLevel): Promise<Locker | null> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      const currentLocker = await manager.findOne(Locker, {
        where: { currentUserId: userId, status: LockerStatus.IN_USE },
      });

      if (!currentLocker) {
        return null;
      }

      const canAccessCurrent = this.memberService.canAccessZone(
        newLevel,
        currentLocker.zone,
        currentLocker.position,
      );

      if (canAccessCurrent) {
        return currentLocker;
      }

      const newLocker = await this.findAvailableLocker(userId);
      if (!newLocker) {
        return currentLocker;
      }

      currentLocker.status = LockerStatus.FREE;
      currentLocker.usedAt = null;
      currentLocker.currentUserId = null;
      currentLocker.isOverdueReminded = false;
      currentLocker.pickupCode = null;
      currentLocker.ticketId = null;
      currentLocker.version = currentLocker.version + 1;
      await manager.save(currentLocker);

      newLocker.status = LockerStatus.IN_USE;
      newLocker.usedAt = new Date();
      newLocker.currentUserId = userId;
      newLocker.isOverdueReminded = false;
      newLocker.pickupCode = this.generatePickupCode();
      newLocker.ticketId = currentLocker.ticketId;
      newLocker.version = newLocker.version + 1;
      await manager.save(newLocker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.OPEN,
        lockerId: newLocker.id,
        operatorId: userId,
        remark: `会员升级自动迁移，从${currentLocker.lockerNo}迁移到${newLocker.lockerNo}`,
      });
      await manager.save(log);

      return newLocker;
    });
  }

  async handleMemberDowngrade(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const currentLocker = await this.lockerRepo.findOne({
      where: { currentUserId: userId, status: LockerStatus.IN_USE },
    });

    if (currentLocker) {
      const canAccess = this.memberService.canAccessZone(
        user.memberLevel,
        currentLocker.zone,
        currentLocker.position,
      );
      if (!canAccess) {
        await this.lockerLogRepo.save(
          this.lockerLogRepo.create({
            action: LockerLogAction.SET_FAULTY,
            lockerId: currentLocker.id,
            operatorId: userId,
            remark: '会员降级，VIP柜组权限已锁定，请更换普通柜组',
          }),
        );
      }
    }
  }

  async getVipComparison(): Promise<VipComparisonDto> {
    const vipZones = this.memberService.getVipZones();
    const normalZones = this.memberService.getNormalZones();

    const [vipTotal, vipInUse, normalTotal, normalInUse] = await Promise.all([
      this.lockerRepo.count({
        where: {
          zone: In(vipZones) as any,
          position: In([...Array(VIP_MAX_POSITION).keys()].map(i => i + 1)) as any,
        },
      }),
      this.lockerRepo.count({
        where: {
          zone: In(vipZones) as any,
          position: In([...Array(VIP_MAX_POSITION).keys()].map(i => i + 1)) as any,
          status: LockerStatus.IN_USE,
        },
      }),
      this.lockerRepo.count({
        where: { zone: In(normalZones) as any },
      }),
      this.lockerRepo.count({
        where: { zone: In(normalZones) as any, status: LockerStatus.IN_USE },
      }),
    ]);

    const vipUsageRate = vipTotal > 0 ? (vipInUse / vipTotal) * 100 : 0;
    const normalUsageRate = normalTotal > 0 ? (normalInUse / normalTotal) * 100 : 0;

    return {
      vipTotal,
      vipInUse,
      vipFree: vipTotal - vipInUse,
      vipUsageRate: parseFloat(vipUsageRate.toFixed(2)),
      normalTotal,
      normalInUse,
      normalFree: normalTotal - normalInUse,
      normalUsageRate: parseFloat(normalUsageRate.toFixed(2)),
    };
  }

  private async broadcastStats() {
    try {
      const stats = await this.getStatistics();
      const zoneStats = await this.getZoneStatistics();
      const totalLockers = stats.total;
      const inUseLockers = stats.inUse;
      const usageRate = totalLockers > 0 ? (inUseLockers / totalLockers) * 100 : 0;
      const isWarning = usageRate > 90;

      this.lockerGateway.broadcastStatisticsUpdate({
        ...stats,
        zoneStatistics: zoneStats,
        usageRate: parseFloat(usageRate.toFixed(2)),
        isWarning,
        warningThreshold: 90,
      });

      if (isWarning) {
        this.lockerGateway.broadcastWarning({
          totalLockers,
          inUseLockers,
          usageRate: parseFloat(usageRate.toFixed(2)),
          isWarning: true,
          warningThreshold: 90,
        });
      }
    } catch (error) {
      console.error('广播统计数据失败', error);
    }
  }
}
