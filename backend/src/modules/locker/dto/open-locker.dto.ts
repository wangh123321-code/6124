import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerZone } from '../../../entities/locker.entity';

export enum OpenMethod {
  BLUETOOTH = 'bluetooth',
  PICKUP_CODE = 'pickup_code',
  TICKET = 'ticket',
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

  @ApiProperty({ description: '票据ID（刷票开柜时必填）', required: false })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiProperty({ description: '票据二维码（刷票开柜时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketQrCode?: string;

  @ApiProperty({ description: '票据取件码（刷票开柜时使用）', required: false })
  @IsOptional()
  @IsString()
  ticketPickupCode?: string;
}
