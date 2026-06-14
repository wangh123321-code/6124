import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, MemberLevel } from './user.entity';

export enum TicketType {
  SINGLE = 'single',
  TIMES_CARD = 'times_card',
  MONTHLY_CARD = 'monthly_card',
}

export enum TicketStatus {
  ACTIVE = 'active',
  USED_UP = 'used_up',
  EXPIRED = 'expired',
  REFUNDING = 'refunding',
  REFUNDED = 'refunded',
}

export interface TicketBenefits {
  memberLevel?: MemberLevel;
  memberDays?: number;
  freeLockerHours?: number;
  vipLockerAccess?: boolean;
  [key: string]: any;
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TicketType,
  })
  type: TicketType;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  totalTimes: number;

  @Column({ default: 0 })
  usedTimes: number;

  @Column({ nullable: true })
  validDays: number;

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus;

  @Column({ default: false })
  isMemberExclusive: boolean;

  @Column({ type: 'json', nullable: true })
  benefits: TicketBenefits;

  @Column({ type: 'json', nullable: true })
  extendedFields: Record<string, any>;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true })
  pickupCode: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
