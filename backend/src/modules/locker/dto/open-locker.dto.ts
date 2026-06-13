import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerZone } from '../../../entities/locker.entity';

export enum OpenMethod {
  BLUETOOTH = 'bluetooth',
  PICKUP_CODE = 'pickup_code',
}

export class OpenLockerDto {
  @ApiProperty({ description: '柜子编号', example: 'A001' })
  @IsString()
  lockerNo: string;

  @ApiProperty({ description: '开柜方式', enum: OpenMethod, example: OpenMethod.BLUETOOTH })
  @IsEnum(OpenMethod)
  openMethod: OpenMethod;

  @ApiProperty({ description: '取件码（取件码开柜时必填）', required: false })
  @IsOptional()
  @IsString()
  pickupCode?: string;
}
