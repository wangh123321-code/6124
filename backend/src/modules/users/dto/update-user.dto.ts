import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsEnum, IsBoolean } from 'class-validator';
import { UserRole, MemberLevel } from '../../../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ description: '密码', example: '123456', minLength: 6, required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: '姓名', example: '张三', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '角色', enum: UserRole, example: UserRole.CUSTOMER, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ description: '会员等级', enum: MemberLevel, example: MemberLevel.NORMAL, required: false })
  @IsOptional()
  @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @ApiProperty({ description: '会员过期时间', required: false })
  @IsOptional()
  memberExpireAt?: Date;

  @ApiProperty({ description: '是否启用', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
