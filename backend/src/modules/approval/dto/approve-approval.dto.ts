import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveApprovalDto {
  @ApiProperty({ description: '审批备注', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}
