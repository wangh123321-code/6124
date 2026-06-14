import { ApiProperty } from '@nestjs/swagger';
import { LockerZone } from '../../../entities/locker.entity';

export class LockerStatisticsDto {
  @ApiProperty({ description: '总柜子数', example: 400 })
  total: number;

  @ApiProperty({ description: '空闲柜子数', example: 350 })
  free: number;

  @ApiProperty({ description: '使用中柜子数', example: 40 })
  inUse: number;

  @ApiProperty({ description: '预留柜子数', example: 5 })
  reserved: number;

  @ApiProperty({ description: '故障柜子数', example: 5 })
  faulty: number;

  @ApiProperty({ description: '超时未提醒数', example: 2 })
  overdue: number;
}

export class ZoneStatisticsDto {
  @ApiProperty({ description: '区域', enum: LockerZone })
  zone: LockerZone;

  @ApiProperty({ description: '总柜子数', example: 100 })
  total: number;

  @ApiProperty({ description: '空闲柜子数', example: 85 })
  free: number;

  @ApiProperty({ description: '使用中柜子数', example: 10 })
  inUse: number;

  @ApiProperty({ description: '预留柜子数', example: 2 })
  reserved: number;

  @ApiProperty({ description: '故障柜子数', example: 3 })
  faulty: number;
}

export class VipComparisonDto {
  @ApiProperty({ description: 'VIP区总柜子数', example: 100 })
  vipTotal: number;

  @ApiProperty({ description: 'VIP区使用中柜子数', example: 40 })
  vipInUse: number;

  @ApiProperty({ description: 'VIP区空闲柜子数', example: 60 })
  vipFree: number;

  @ApiProperty({ description: 'VIP区使用率(%)', example: 40.5 })
  vipUsageRate: number;

  @ApiProperty({ description: '普通区总柜子数', example: 200 })
  normalTotal: number;

  @ApiProperty({ description: '普通区使用中柜子数', example: 80 })
  normalInUse: number;

  @ApiProperty({ description: '普通区空闲柜子数', example: 120 })
  normalFree: number;

  @ApiProperty({ description: '普通区使用率(%)', example: 40.0 })
  normalUsageRate: number;
}
