import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogService } from '../../common/services/log.service';
import { OperationLog } from '../../entities/operation-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
