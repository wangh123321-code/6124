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

export enum ApprovalType {
  REFUND = 'refund',
  EXCHANGE = 'exchange',
}

export enum ApprovalStatus {
  PENDING_FRONT_DESK = 'pending_front_desk',
  PENDING_MANAGER = 'pending_manager',
  PENDING_FINANCE = 'pending_finance',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('approvals')
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ApprovalType,
  })
  type: ApprovalType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING_FRONT_DESK,
  })
  status: ApprovalStatus;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @ManyToOne(() => Ticket)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column()
  ticketId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'applicantId' })
  applicant: User;

  @Column()
  applicantId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'frontDeskApproverId' })
  frontDeskApprover: User;

  @Column({ nullable: true })
  frontDeskApproverId: string;

  @Column({ type: 'timestamp', nullable: true })
  frontDeskApprovedAt: Date;

  @Column({ type: 'text', nullable: true })
  frontDeskRemark: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'managerApproverId' })
  managerApprover: User;

  @Column({ nullable: true })
  managerApproverId: string;

  @Column({ type: 'timestamp', nullable: true })
  managerApprovedAt: Date;

  @Column({ type: 'text', nullable: true })
  managerRemark: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'financeApproverId' })
  financeApprover: User;

  @Column({ nullable: true })
  financeApproverId: string;

  @Column({ type: 'timestamp', nullable: true })
  financeApprovedAt: Date;

  @Column({ type: 'text', nullable: true })
  financeRemark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
