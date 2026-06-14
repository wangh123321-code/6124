import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dayjs from 'dayjs';
import { User, UserRole, MemberLevel } from '../../entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
  }

  async seedUsers() {
    const count = await this.userRepo.count();
    if (count > 0) {
      return;
    }

    this.logger.log('开始初始化用户数据...');

    const users = [
      {
        username: 'admin',
        password: 'admin123',
        name: '系统管理员',
        phone: '13800000001',
        role: UserRole.ADMIN,
        memberLevel: MemberLevel.DIAMOND,
        memberExpireAt: dayjs().add(365, 'day').toDate(),
      },
      {
        username: 'manager',
        password: 'manager123',
        name: '主管张经理',
        phone: '13800000002',
        role: UserRole.MANAGER,
        memberLevel: MemberLevel.GOLD,
        memberExpireAt: dayjs().add(180, 'day').toDate(),
      },
      {
        username: 'finance',
        password: 'finance123',
        name: '财务李会计',
        phone: '13800000003',
        role: UserRole.FINANCE,
        memberLevel: MemberLevel.NORMAL,
        memberExpireAt: null,
      },
      {
        username: 'frontdesk',
        password: 'front123',
        name: '前台小王',
        phone: '13800000004',
        role: UserRole.FRONT_DESK,
        memberLevel: MemberLevel.NORMAL,
        memberExpireAt: null,
      },
      {
        username: 'customer1',
        password: 'customer123',
        name: '普通会员-张三',
        phone: '13900000001',
        role: UserRole.CUSTOMER,
        memberLevel: MemberLevel.NORMAL,
        memberExpireAt: null,
      },
      {
        username: 'silver_vip',
        password: 'vip123456',
        name: '银卡会员-李四',
        phone: '13900000002',
        role: UserRole.CUSTOMER,
        memberLevel: MemberLevel.SILVER,
        memberExpireAt: dayjs().add(30, 'day').toDate(),
      },
      {
        username: 'gold_vip',
        password: 'vip123456',
        name: '金卡会员-王五',
        phone: '13900000003',
        role: UserRole.CUSTOMER,
        memberLevel: MemberLevel.GOLD,
        memberExpireAt: dayjs().add(90, 'day').toDate(),
      },
      {
        username: 'diamond_vip',
        password: 'vip123456',
        name: '钻石会员-赵六',
        phone: '13900000004',
        role: UserRole.CUSTOMER,
        memberLevel: MemberLevel.DIAMOND,
        memberExpireAt: dayjs().add(365, 'day').toDate(),
      },
      {
        username: 'expired_vip',
        password: 'vip123456',
        name: '过期会员-孙七',
        phone: '13900000005',
        role: UserRole.CUSTOMER,
        memberLevel: MemberLevel.SILVER,
        memberExpireAt: dayjs().subtract(1, 'day').toDate(),
      },
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = this.userRepo.create({
        ...user,
        password: hashedPassword,
      });
      await this.userRepo.save(newUser);
    }

    this.logger.log('用户数据初始化完成');
    this.logger.log('默认账号: admin / admin123 (管理员, 钻石会员)');
    this.logger.log('默认账号: manager / manager123 (主管, 金卡会员)');
    this.logger.log('默认账号: finance / finance123 (财务, 普通会员)');
    this.logger.log('默认账号: frontdesk / front123 (前台, 普通会员)');
    this.logger.log('默认账号: customer1 / customer123 (普通用户)');
    this.logger.log('默认账号: silver_vip / vip123456 (银卡会员)');
    this.logger.log('默认账号: gold_vip / vip123456 (金卡会员)');
    this.logger.log('默认账号: diamond_vip / vip123456 (钻石会员)');
    this.logger.log('默认账号: expired_vip / vip123456 (过期会员)');
  }
}
