import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionService } from './admission.service';
import { AdmissionController } from './admission.controller';
import { Ticket } from '../../entities/ticket.entity';
import { Order } from '../../entities/order.entity';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { User } from '../../entities/user.entity';
import { Locker } from '../../entities/locker.entity';
import { LockerLog } from '../../entities/locker-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Order, TicketUsageRecord, User, Locker, LockerLog]),
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService],
  exports: [AdmissionService],
})
export class AdmissionModule {}
