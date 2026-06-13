import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../entities/user.entity';

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
      },
      {
        username: 'manager',
        password: 'manager123',
        name: '主管张经理',
        phone: '13800000002',
        role: UserRole.MANAGER,
      },
      {
        username: 'finance',
        password: 'finance123',
        name: '财务李会计',
        phone: '13800000003',
        role: UserRole.FINANCE,
      },
      {
        username: 'frontdesk',
        password: 'front123',
        name: '前台小王',
        phone: '13800000004',
        role: UserRole.FRONT_DESK,
      },
      {
        username: 'customer1',
        password: 'customer123',
        name: '测试用户',
        phone: '13900000001',
        role: UserRole.CUSTOMER,
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
    this.logger.log('默认账号: admin / admin123 (管理员)');
    this.logger.log('默认账号: manager / manager123 (主管)');
    this.logger.log('默认账号: finance / finance123 (财务)');
    this.logger.log('默认账号: frontdesk / front123 (前台)');
    this.logger.log('默认账号: customer1 / customer123 (游客)');
  }
}
