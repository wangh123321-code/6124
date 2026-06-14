import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Ticket, TicketBenefits } from './ticket.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderNo: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PAID,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  ticketType: string;

  @Column({ nullable: true })
  ticketName: string;

  @Column({ type: 'json', nullable: true })
  memberBenefits: TicketBenefits;

  @Column({ type: 'json', nullable: true })
  extendedFields: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Ticket, { nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ nullable: true })
  ticketId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ nullable: true })
  sellerId: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @CreateDateColumn()
  createdAt: Date;
}
