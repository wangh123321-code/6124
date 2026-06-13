import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';
import { Locker } from '../../entities/locker.entity';
import { LockerLog } from '../../entities/locker-log.entity';
import { LogModule } from '../log/log.module';
import { GatewayModule } from '../../gateways/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Locker, LockerLog]),
    LogModule,
    GatewayModule,
  ],
  controllers: [LockerController],
  providers: [LockerService],
  exports: [LockerService],
})
export class LockerModule {}
