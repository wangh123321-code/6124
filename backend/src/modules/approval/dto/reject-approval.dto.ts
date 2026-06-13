import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectApprovalDto {
  @ApiProperty({ description: '拒绝原因' })
  @IsString()
  @IsNotEmpty()
  remark: string;
}
