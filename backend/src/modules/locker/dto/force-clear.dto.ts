import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ForceClearDto {
  @ApiProperty({ description: '柜子编号', example: 'A001' })
  @IsString()
  lockerNo: string;

  @ApiProperty({ description: '清柜原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
