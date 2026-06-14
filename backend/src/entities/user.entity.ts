import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  FINANCE = 'finance',
  FRONT_DESK = 'front_desk',
  CUSTOMER = 'customer',
}

export enum MemberLevel {
  NORMAL = 'normal',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: MemberLevel,
    default: MemberLevel.NORMAL,
  })
  memberLevel: MemberLevel;

  @Column({ type: 'timestamp', nullable: true })
  memberExpireAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
