import { Module } from '@nestjs/common';
import { LockerGateway } from './locker.gateway';

@Module({
  providers: [LockerGateway],
  exports: [LockerGateway],
})
export class GatewayModule {}
