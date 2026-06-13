import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('ticket_usage_records')
export class TicketUsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  lockerId: string;

  @Column({ default: 1 })
  timesUsed: number;

  @Column({ nullable: true })
  checkInAt: Date;

  @Column({ nullable: true })
  checkOutAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
