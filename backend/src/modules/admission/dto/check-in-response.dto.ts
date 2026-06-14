import { ApiProperty } from '@nestjs/swagger';
import { TicketResponseDto } from '../../ticket/dto/ticket-response.dto';
import { OrderResponseDto } from '../../ticket/dto/order-response.dto';
import { Locker } from '../../../entities/locker.entity';
import { TicketUsageRecord } from '../../../entities/ticket-usage-record.entity';

export class CheckInResponseDto {
  @ApiProperty({ description: '是否成功入场' })
  success: boolean;

  @ApiProperty({ description: '票卡信息', required: false })
  ticket?: TicketResponseDto;

  @ApiProperty({ description: '订单信息（现场购票时）', required: false })
  order?: OrderResponseDto;

  @ApiProperty({ description: '使用记录', required: false })
  usageRecord?: TicketUsageRecord;

  @ApiProperty({ description: '分配的储物柜', required: false })
  locker?: Locker;

  @ApiProperty({ description: '消息' })
  message: string;
}
