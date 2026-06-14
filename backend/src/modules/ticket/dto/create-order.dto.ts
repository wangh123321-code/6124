import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';
import { TicketType, TicketBenefits } from '../../../entities/ticket.entity';
import { MemberLevel } from '../../../entities/user.entity';

export class CreateOrderDto {
  @ApiProperty({ enum: TicketType, description: '票卡类型' })
  @IsEnum(TicketType)
  @IsNotEmpty()
  ticketType: TicketType;

  @ApiProperty({ description: '票卡名称' })
  @IsString()
  @IsNotEmpty()
  ticketName: string;

  @ApiProperty({ description: '价格', required: false })
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: '总次数（次卡必填）', required: false })
  @IsOptional()
  totalTimes?: number;

  @ApiProperty({ description: '有效天数（月卡必填）', required: false })
  @IsOptional()
  validDays?: number;

  @ApiProperty({ description: '支付方式', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: '是否会员专属票种', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isMemberExclusive?: boolean;

  @ApiProperty({ description: '会员权益配置', required: false })
  @IsOptional()
  @IsObject()
  benefits?: TicketBenefits;

  @ApiProperty({ enum: MemberLevel, description: '升级到的会员等级（VIP票种时使用）', required: false })
  @IsOptional()
  @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @ApiProperty({ description: '会员有效期天数', required: false })
  @IsOptional()
  memberDays?: number;
}
