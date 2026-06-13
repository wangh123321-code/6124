import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApprovalType } from '../../../entities/approval.entity';

export class CreateApprovalDto {
  @ApiProperty({ enum: ApprovalType, description: '审批类型' })
  @IsEnum(ApprovalType)
  @IsNotEmpty()
  type: ApprovalType;

  @ApiProperty({ description: '票卡ID' })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({ description: '退款金额', required: false })
  @IsNumber()
  @IsOptional()
  refundAmount?: number;

  @ApiProperty({ description: '申请原因', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
