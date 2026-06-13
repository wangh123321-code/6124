import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketType } from '../../../entities/ticket.entity';

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
}
