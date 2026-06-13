import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LockerService } from '../locker/locker.service';
import { Ticket, TicketStatus, TicketType } from '../../entities/ticket.entity';
import { LockerGateway } from '../../gateways/locker.gateway';
import * as dayjs from 'dayjs';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private lockerService: LockerService,
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    private lockerGateway: LockerGateway,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleOverdueReminder() {
    this.logger.debug('开始检查超时柜子...');
    const count = await this.lockerService.checkOverdueAndRemind();
    if (count > 0) {
      this.logger.log(`已提醒 ${count} 个超时柜子`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredMonthlyCards() {
    this.logger.debug('开始检查过期月卡...');

    const expiredTickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.type = :type', { type: TicketType.MONTHLY_CARD })
      .andWhere('ticket.status = :status', { status: TicketStatus.ACTIVE })
      .andWhere('ticket.expireAt IS NOT NULL')
      .andWhere('ticket.expireAt < :now', { now: new Date() })
      .getMany();

    if (expiredTickets.length > 0) {
      for (const ticket of expiredTickets) {
        ticket.status = TicketStatus.EXPIRED;
      }
      await this.ticketRepo.save(expiredTickets);
      this.logger.log(`已标记 ${expiredTickets.length} 张过期月卡`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async broadcastLockerStats() {
    try {
      const stats = await this.lockerService.getStatistics();
      const zoneStats = await this.lockerService.getZoneStatistics();

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
      this.logger.error('广播柜子统计失败', error);
    }
  }
}
