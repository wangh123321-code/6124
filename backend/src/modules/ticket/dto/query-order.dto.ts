import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../entities/order.entity';

export class QueryOrderDto {
  @ApiProperty({ enum: OrderStatus, description: '订单状态', required: false })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ description: '用户ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: '票卡类型', required: false })
  @IsString()
  @IsOptional()
  ticketType?: string;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  pageSize?: number;
}
