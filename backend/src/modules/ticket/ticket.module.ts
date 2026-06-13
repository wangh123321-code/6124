import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Ticket } from '../../entities/ticket.entity';
import { Order } from '../../entities/order.entity';
import { TicketUsageRecord } from '../../entities/ticket-usage-record.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { User } from '../../entities/user.entity';
import { LogService } from '../../common/services/log.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Order, TicketUsageRecord, OperationLog, User])],
  controllers: [TicketController],
  providers: [TicketService, LogService],
  exports: [TicketService],
})
export class TicketModule {}
