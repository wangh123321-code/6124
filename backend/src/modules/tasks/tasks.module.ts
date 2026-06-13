import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { LockerModule } from '../locker/locker.module';
import { Ticket } from '../../entities/ticket.entity';
import { GatewayModule } from '../../gateways/gateway.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Ticket]),
    LockerModule,
    GatewayModule,
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
