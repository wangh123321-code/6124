import { ApiProperty } from '@nestjs/swagger';
import { TicketType, TicketStatus, TicketBenefits } from '../../../entities/ticket.entity';

export class TicketResponseDto {
  @ApiProperty({ description: '票卡ID' })
  id: string;

  @ApiProperty({ enum: TicketType, description: '票卡类型' })
  type: TicketType;

  @ApiProperty({ description: '票卡名称' })
  name: string;

  @ApiProperty({ description: '价格' })
  price: number;

  @ApiProperty({ description: '总次数', required: false })
  totalTimes?: number;

  @ApiProperty({ description: '已用次数' })
  usedTimes: number;

  @ApiProperty({ description: '有效天数', required: false })
  validDays?: number;

  @ApiProperty({ description: '过期时间', required: false })
  expireAt?: Date;

  @ApiProperty({ enum: TicketStatus, description: '票卡状态' })
  status: TicketStatus;

  @ApiProperty({ description: '是否会员专属' })
  isMemberExclusive: boolean;

  @ApiProperty({ description: '会员权益配置', required: false })
  benefits?: TicketBenefits;

  @ApiProperty({ description: '扩展字段', required: false })
  extendedFields?: Record<string, any>;

  @ApiProperty({ description: '二维码', required: false })
  qrCode?: string;

  @ApiProperty({ description: '取件码', required: false })
  pickupCode?: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
