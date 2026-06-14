import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TicketType } from '../../../entities/ticket.entity';
import { MemberLevel } from '../../../entities/user.entity';

export class CheckInDto {
  @ApiProperty({ description: '票卡ID（已有票卡时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiProperty({ description: '票卡二维码（已有票卡时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketQrCode?: string;

  @ApiProperty({ description: '票卡取件码（已有票卡时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketPickupCode?: string;

  @ApiProperty({ enum: TicketType, description: '票卡类型（现场购票时使用）', required: false })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @ApiProperty({ description: '票卡名称（现场购票时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketName?: string;

  @ApiProperty({ description: '价格（现场购票时使用）', required: false })
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: '总次数（次卡必填，现场购票时使用）', required: false })
  @IsOptional()
  totalTimes?: number;

  @ApiProperty({ description: '有效天数（月卡必填，现场购票时使用）', required: false })
  @IsOptional()
  validDays?: number;

  @ApiProperty({ description: '是否会员专属票种', required: false, default: false })
  @IsOptional()
  isMemberExclusive?: boolean;

  @ApiProperty({ enum: MemberLevel, description: '升级到的会员等级（VIP票种时使用）', required: false })
  @IsOptional()
  @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @ApiProperty({ description: '会员有效期天数', required: false })
  @IsOptional()
  memberDays?: number;

  @ApiProperty({ description: '支付方式', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: '是否需要分配储物柜', required: false, default: true })
  @IsOptional()
  allocateLocker?: boolean;
}
