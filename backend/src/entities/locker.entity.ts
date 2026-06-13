import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Ticket } from './ticket.entity';

export enum LockerStatus {
  FREE = 'free',
  IN_USE = 'in_use',
  RESERVED = 'reserved',
  FAULTY = 'faulty',
}

export enum LockerZone {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  lockerNo: string;

  @Column({
    type: 'enum',
    enum: LockerZone,
  })
  zone: LockerZone;

  @Column()
  position: number;

  @Column({
    type: 'enum',
    enum: LockerStatus,
    default: LockerStatus.FREE,
  })
  status: LockerStatus;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  pickupCode: string;

  @Column({ default: false })
  isOverdueReminded: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'currentUserId' })
  currentUser: User;

  @Column({ nullable: true })
  currentUserId: string;

  @ManyToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ nullable: true })
  ticketId: string;

  @Column({ default: 0 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
