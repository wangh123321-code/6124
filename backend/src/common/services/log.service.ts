import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog, LogModule, LogAction } from '../../entities/operation-log.entity';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(OperationLog)
    private logRepo: Repository<OperationLog>,
  ) {}

  async record(
    module: LogModule,
    action: LogAction,
    description: string,
    operatorId?: string,
    detail?: Record<string, any>,
    ip?: string,
  ) {
    const log = this.logRepo.create({
      module,
      action,
      description,
      operatorId,
      detail,
      ip,
    });
    return this.logRepo.save(log);
  }
}
