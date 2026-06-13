import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as dayjs from 'dayjs';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { LockerLog, LockerLogAction } from '../../entities/locker-log.entity';
import { Locker, LockerStatus } from '../../entities/locker.entity';
import { Order, OrderStatus } from '../../entities/order.entity';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(TicketUsageRecord)
    private ticketUsageRecordRepo: Repository<TicketUsageRecord>,
    @InjectRepository(LockerLog)
    private lockerLogRepo: Repository<LockerLog>,
    @InjectRepository(Locker)
    private lockerRepo: Repository<Locker>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private logService: LogService,
  ) {}

  async getTodayVisitorFlow(operatorId?: string) {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const records = await this.ticketUsageRecordRepo
      .createQueryBuilder('record')
      .select("EXTRACT(HOUR FROM record.checkInAt) as hour")
      .addSelect('COUNT(*) as count')
      .where('record.checkInAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .groupBy("EXTRACT(HOUR FROM record.checkInAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    const result = [];
    for (let i = 0; i < 24; i++) {
      const hourRecord = records.find(r => parseInt(r.hour) === i);
      result.push({
        hour: i,
        count: hourRecord ? parseInt(hourRecord.count) : 0,
      });
    }

    await this.logService.record(
      LogModule.STATISTICS,
      LogAction.EXPORT,
      '查询今日客流曲线',
      operatorId,
    );

    return result;
  }

  async getLockerUsageByHour(operatorId?: string) {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const totalLockers = await this.lockerRepo.count();

    const openLogs = await this.lockerLogRepo
      .createQueryBuilder('log')
      .select("EXTRACT(HOUR FROM log.createdAt) as hour")
      .addSelect('COUNT(*) as openCount')
      .where('log.action = :action', { action: LockerLogAction.OPEN })
      .andWhere('log.createdAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .groupBy("EXTRACT(HOUR FROM log.createdAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    const result = [];
    for (let i = 0; i < 24; i++) {
      const hourRecord = openLogs.find(r => parseInt(r.hour) === i);
      const openCount = hourRecord ? parseInt(hourRecord.openCount) : 0;
      const usageRate = totalLockers > 0 ? (openCount / totalLockers) * 100 : 0;

      result.push({
        hour: i,
        openCount,
        totalLockers,
        usageRate: parseFloat(usageRate.toFixed(2)),
        isWarning: usageRate > 90,
      });
    }

    await this.logService.record(
      LogModule.STATISTICS,
      LogAction.EXPORT,
      '查询各时段柜子使用率',
      operatorId,
    );

    return result;
  }

  async getTicketSalesStats(operatorId?: string) {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const stats = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.ticketType', 'ticketType')
      .addSelect('order.ticketName', 'ticketName')
      .addSelect('COUNT(*) as salesCount')
      .addSelect('SUM(order.amount) as totalAmount')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .groupBy('order.ticketType, order.ticketName')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    const totalSales = stats.reduce((sum, item) => sum + parseInt(item.salesCount), 0);
    const totalAmount = stats.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);

    const result = stats.map(item => ({
      ticketType: item.ticketType,
      ticketName: item.ticketName,
      salesCount: parseInt(item.salesCount),
      totalAmount: parseFloat(parseFloat(item.totalAmount).toFixed(2)),
      countRatio: totalSales > 0 ? parseFloat(((parseInt(item.salesCount) / totalSales) * 100).toFixed(2)) : 0,
      amountRatio: totalAmount > 0 ? parseFloat(((parseFloat(item.totalAmount) / totalAmount) * 100).toFixed(2)) : 0,
    }));

    await this.logService.record(
      LogModule.STATISTICS,
      LogAction.EXPORT,
      '查询票卡销售占比',
      operatorId,
    );

    return {
      list: result,
      totalSales,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  }

  async getLockerUsageWarning(operatorId?: string) {
    const totalLockers = await this.lockerRepo.count();
    const inUseLockers = await this.lockerRepo.count({
      where: { status: LockerStatus.IN_USE },
    });

    const usageRate = totalLockers > 0 ? (inUseLockers / totalLockers) * 100 : 0;
    const isWarning = usageRate > 90;

    const allLockers = await this.lockerRepo.find({
      where: { status: LockerStatus.IN_USE },
      relations: ['currentUser'],
    });

    await this.logService.record(
      LogModule.STATISTICS,
      LogAction.EXPORT,
      '查询柜子使用率预警',
      operatorId,
    );

    return {
      totalLockers,
      inUseLockers,
      usageRate: parseFloat(usageRate.toFixed(2)),
      isWarning,
      warningThreshold: 90,
      inUseLockerDetails: allLockers,
    };
  }

  async getTodayOverview(operatorId?: string) {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const visitorCount = await this.ticketUsageRecordRepo.count({
      where: {
        checkInAt: Between(startOfDay, endOfDay),
      },
    });

    const totalOrders = await this.orderRepo.count({
      where: {
        status: OrderStatus.PAID,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const salesAmountResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.amount)', 'total')
      .where('order.status = :status', { status: OrderStatus.PAID })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .getRawOne();

    const salesAmount = salesAmountResult?.total ? parseFloat(salesAmountResult.total) : 0;

    const totalLockers = await this.lockerRepo.count();
    const inUseLockers = await this.lockerRepo.count({
      where: { status: LockerStatus.IN_USE },
    });
    const lockerUsageRate = totalLockers > 0 ? (inUseLockers / totalLockers) * 100 : 0;

    const freeLockers = await this.lockerRepo.count({
      where: { status: LockerStatus.FREE },
    });

    await this.logService.record(
      LogModule.STATISTICS,
      LogAction.EXPORT,
      '查询今日数据概览',
      operatorId,
    );

    return {
      visitor: {
        todayCount: visitorCount,
      },
      sales: {
        todayOrders: totalOrders,
        todayAmount: parseFloat(salesAmount.toFixed(2)),
      },
      locker: {
        total: totalLockers,
        inUse: inUseLockers,
        free: freeLockers,
        usageRate: parseFloat(lockerUsageRate.toFixed(2)),
        isWarning: lockerUsageRate > 90,
      },
    };
  }
}
