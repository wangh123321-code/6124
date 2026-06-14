import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, MemberLevel } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MemberService } from '../../common/services/member.service';
import { LockerService } from '../locker/locker.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private memberService: MemberService,
    private lockerService: LockerService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || UserRole.CUSTOMER,
    });

    const savedUser = await this.userRepository.save(user);

    return this.sanitizeUser(savedUser);
  }

  async findAll(page: number = 1, pageSize: number = 10, role?: UserRole) {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.where('user.role = :role', { role });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map((user) => this.sanitizeUser(user)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const oldMemberLevel = user.memberLevel;
    const updateData: Partial<User> = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateData);

    const updatedUser = await this.userRepository.findOne({
      where: { id },
    });

    if (updateUserDto.memberLevel && updateUserDto.memberLevel !== oldMemberLevel) {
      if (this.memberService.isHigherLevel(updateUserDto.memberLevel, oldMemberLevel)) {
        try {
          await this.lockerService.handleMemberUpgrade(id, updateUserDto.memberLevel);
        } catch (error) {
          console.error('会员升级时处理柜子迁移失败', error);
        }
      } else if (this.memberService.isLowerLevel(updateUserDto.memberLevel, oldMemberLevel)) {
        try {
          await this.lockerService.handleMemberDowngrade(id);
        } catch (error) {
          console.error('会员降级时处理权限锁定失败', error);
        }
      }
    }

    return this.sanitizeUser(updatedUser!);
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.delete(id);

    return { message: '删除成功' };
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}
