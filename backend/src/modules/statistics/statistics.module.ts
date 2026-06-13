import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { LockerLog } from '../../entities/locker-log.entity';
import { Locker } from '../../entities/locker.entity';
import { Order } from '../../entities/order.entity';
import { LogModule } from '../log/log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketUsageRecord, LockerLog, Locker, Order]),
    LogModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
