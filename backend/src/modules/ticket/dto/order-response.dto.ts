import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../entities/order.entity';

export class OrderResponseDto {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '订单号' })
  orderNo: string;

  @ApiProperty({ description: '订单金额' })
  amount: number;

  @ApiProperty({ enum: OrderStatus, description: '订单状态' })
  status: OrderStatus;

  @ApiProperty({ description: '票卡类型', required: false })
  ticketType?: string;

  @ApiProperty({ description: '票卡名称', required: false })
  ticketName?: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '票卡ID', required: false })
  ticketId?: string;

  @ApiProperty({ description: '售票员ID', required: false })
  sellerId?: string;

  @ApiProperty({ description: '支付方式', required: false })
  paymentMethod?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
