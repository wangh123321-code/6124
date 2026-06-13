import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RepairLockerDto {
  @ApiProperty({ description: '柜子编号', example: 'A001' })
  @IsString()
  lockerNo: string;

  @ApiProperty({ description: '修复备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
