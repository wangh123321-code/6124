import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum LogModule {
  AUTH = 'auth',
  TICKET = 'ticket',
  LOCKER = 'locker',
  APPROVAL = 'approval',
  STATISTICS = 'statistics',
  SYSTEM = 'system',
}

export enum LogAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  USE = 'use',
  REFUND = 'refund',
  EXCHANGE = 'exchange',
  OPEN_LOCKER = 'open_locker',
  CLOSE_LOCKER = 'close_locker',
  FORCE_CLEAR = 'force_clear',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
}

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LogModule,
  })
  module: LogModule;

  @Column({
    type: 'enum',
    enum: LogAction,
  })
  action: LogAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  detail: Record<string, any>;

  @Column({ nullable: true })
  ip: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column({ nullable: true })
  operatorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
