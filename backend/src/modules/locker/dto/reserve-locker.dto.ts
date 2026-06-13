import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReserveLockerDto {
  @ApiProperty({ description: '柜子编号', example: 'A001' })
  @IsString()
  lockerNo: string;
}
