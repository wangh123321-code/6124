import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SetFaultyDto {
  @ApiProperty({ description: '柜子编号', example: 'A001' })
  @IsString()
  lockerNo: string;

  @ApiProperty({ description: '故障描述', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
