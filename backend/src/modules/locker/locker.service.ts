import { Injectable, OnModuleInit, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Locker, LockerStatus, LockerZone } from '../../entities/locker.entity';
import { LockerLog, LockerLogAction } from '../../entities/locker-log.entity';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';
import { OpenLockerDto, OpenMethod } from './dto/open-locker.dto';
import { CloseLockerDto } from './dto/close-locker.dto';
import { ReserveLockerDto } from './dto/reserve-locker.dto';
import { ForceClearDto } from './dto/force-clear.dto';
import { SetFaultyDto } from './dto/set-faulty.dto';
import { RepairLockerDto } from './dto/repair-locker.dto';
import { LockerQueryDto } from './dto/locker-query.dto';
import { LockerStatisticsDto, ZoneStatisticsDto } from './dto/locker-statistics.dto';
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
    private dataSource: DataSource,
    private logService: LogService,
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
    const result = await this.dataSource.transaction(async (manager) => {
      const locker = await manager.findOne(Locker, {
        where: { lockerNo: dto.lockerNo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locker) {
        throw new NotFoundException('柜子不存在');
      }

      if (locker.status === LockerStatus.FAULTY) {
        throw new BadRequestException('柜子故障，无法打开');
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
        locker.status = LockerStatus.IN_USE;
        locker.usedAt = new Date();
        locker.currentUserId = userId;
        locker.isOverdueReminded = false;
        locker.pickupCode = this.generatePickupCode();
      }

      locker.version = locker.version + 1;

      const updatedLocker = await manager.save(locker);

      const log = manager.create(LockerLog, {
        action: LockerLogAction.OPEN,
        lockerId: locker.id,
        operatorId: userId,
        openMethod: dto.openMethod,
        remark: `使用${dto.openMethod === OpenMethod.BLUETOOTH ? '蓝牙' : '取件码'}开柜`,
      });
      await manager.save(log);

      await this.logService.record(
        LogModule.LOCKER,
        LogAction.OPEN_LOCKER,
        `打开柜子 ${locker.lockerNo}`,
        userId,
        { lockerNo: locker.lockerNo, openMethod: dto.openMethod },
      );

      return updatedLocker;
    });

    this.lockerGateway.broadcastLockerUpdate(result);
    this.broadcastStats();

    return result;
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
