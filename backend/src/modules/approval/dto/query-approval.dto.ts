import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalStatus, ApprovalType } from '../../../entities/approval.entity';

export class QueryApprovalDto {
  @ApiProperty({ enum: ApprovalStatus, description: '审批状态', required: false })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @ApiProperty({ enum: ApprovalType, description: '审批类型', required: false })
  @IsEnum(ApprovalType)
  @IsOptional()
  type?: ApprovalType;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;
}
