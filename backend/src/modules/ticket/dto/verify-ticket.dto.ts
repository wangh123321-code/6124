import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VerifyTicketDto {
  @ApiProperty({ description: '票卡ID', required: false })
  @IsString()
  @IsOptional()
  ticketId?: string;

  @ApiProperty({ description: '二维码内容', required: false })
  @IsString()
  @IsOptional()
  qrCode?: string;

  @ApiProperty({ description: '取件码', required: false })
  @IsString()
  @IsOptional()
  pickupCode?: string;

  @ApiProperty({ description: '储物柜ID', required: false })
  @IsString()
  @IsOptional()
  lockerId?: string;
}
