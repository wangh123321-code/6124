import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerZone, LockerStatus } from '../../../entities/locker.entity';

export class LockerQueryDto {
  @ApiProperty({ description: '区域', enum: LockerZone, required: false })
  @IsOptional()
  @IsEnum(LockerZone)
  zone?: LockerZone;

  @ApiProperty({ description: '状态', enum: LockerStatus, required: false })
  @IsOptional()
  @IsEnum(LockerStatus)
  status?: LockerStatus;
}
