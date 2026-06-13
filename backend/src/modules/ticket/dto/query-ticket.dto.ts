import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketType, TicketStatus } from '../../../entities/ticket.entity';

export class QueryTicketDto {
  @ApiProperty({ enum: TicketType, description: '票卡类型', required: false })
  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @ApiProperty({ enum: TicketStatus, description: '票卡状态', required: false })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({ description: '用户ID', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  pageSize?: number;
}
