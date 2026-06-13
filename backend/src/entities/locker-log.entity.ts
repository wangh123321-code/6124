import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Locker } from './locker.entity';

export enum LockerLogAction {
  OPEN = 'open',
  CLOSE = 'close',
  RESERVE = 'reserve',
  CANCEL_RESERVE = 'cancel_reserve',
  FORCE_CLEAR = 'force_clear',
  SET_FAULTY = 'set_faulty',
  REPAIR = 'repair',
}

@Entity('locker_logs')
export class LockerLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LockerLogAction,
  })
  action: LockerLogAction;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @ManyToOne(() => Locker)
  @JoinColumn({ name: 'lockerId' })
  locker: Locker;

  @Column()
  lockerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column({ nullable: true })
  operatorId: string;

  @Column({ nullable: true })
  openMethod: string;

  @CreateDateColumn()
  createdAt: Date;
}
