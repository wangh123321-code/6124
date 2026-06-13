import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LockerService } from './locker.service';
import { Locker, LockerZone, LockerStatus } from '../../entities/locker.entity';
import { UserRole } from '../../entities/user.entity';
import { LockerLog } from '../../entities/locker-log.entity';
import { OpenLockerDto } from './dto/open-locker.dto';
import { CloseLockerDto } from './dto/close-locker.dto';
import { ReserveLockerDto } from './dto/reserve-locker.dto';
import { ForceClearDto } from './dto/force-clear.dto';
import { SetFaultyDto } from './dto/set-faulty.dto';
import { RepairLockerDto } from './dto/repair-locker.dto';
import { LockerQueryDto } from './dto/locker-query.dto';
import { LockerStatisticsDto, ZoneStatisticsDto } from './dto/locker-statistics.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('储物柜')
@ApiBearerAuth()
@Controller('lockers')
@UseGuards(RolesGuard)
export class LockerController {
  constructor(private readonly lockerService: LockerService) {}

  @Get()
  @ApiOperation({ summary: '查询柜子列表' })
  @ApiResponse({ status: 200, description: '柜子列表', type: [Locker] })
  findAll(@Query() query: LockerQueryDto): Promise<Locker[]> {
    return this.lockerService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取柜子统计信息' })
  @ApiResponse({ status: 200, description: '统计信息', type: LockerStatisticsDto })
  getStatistics(): Promise<LockerStatisticsDto> {
    return this.lockerService.getStatistics();
  }

  @Get('zone-statistics')
  @ApiOperation({ summary: '按区获取柜子统计信息' })
  @ApiResponse({ status: 200, description: '各区统计信息', type: [ZoneStatisticsDto] })
  getZoneStatistics(): Promise<ZoneStatisticsDto[]> {
    return this.lockerService.getZoneStatistics();
  }

  @Get('zone/:zone')
  @ApiOperation({ summary: '按区查询柜子' })
  @ApiResponse({ status: 200, description: '该区柜子列表', type: [Locker] })
  findByZone(@Param('zone') zone: LockerZone): Promise<Locker[]> {
    return this.lockerService.findByZone(zone);
  }

  @Get(':lockerNo')
  @ApiOperation({ summary: '查询单个柜子' })
  @ApiResponse({ status: 200, description: '柜子信息', type: Locker })
  findByLockerNo(@Param('lockerNo') lockerNo: string): Promise<Locker> {
    return this.lockerService.findByLockerNo(lockerNo);
  }

  @Get(':lockerNo/logs')
  @ApiOperation({ summary: '查询柜子操作日志' })
  @ApiResponse({ status: 200, description: '操作日志列表', type: [LockerLog] })
  getLockerLogs(@Param('lockerNo') lockerNo: string): Promise<LockerLog[]> {
    return this.lockerService.getLockerLogs(lockerNo);
  }

  @Post('open')
  @ApiOperation({ summary: '开柜' })
  @ApiResponse({ status: 200, description: '开柜成功', type: Locker })
  openLocker(
    @Body() dto: OpenLockerDto,
    @CurrentUser('id') userId: string,
  ): Promise<Locker> {
    return this.lockerService.openLocker(dto, userId);
  }

  @Post('close')
  @ApiOperation({ summary: '关柜' })
  @ApiResponse({ status: 200, description: '关柜成功', type: Locker })
  closeLocker(
    @Body() dto: CloseLockerDto,
    @CurrentUser('id') userId: string,
  ): Promise<Locker> {
    return this.lockerService.closeLocker(dto, userId);
  }

  @Post('reserve')
  @ApiOperation({ summary: '预留柜子' })
  @ApiResponse({ status: 200, description: '预留成功', type: Locker })
  reserveLocker(
    @Body() dto: ReserveLockerDto,
    @CurrentUser('id') userId: string,
  ): Promise<Locker> {
    return this.lockerService.reserveLocker(dto, userId);
  }

  @Post('cancel-reserve')
  @ApiOperation({ summary: '取消预留' })
  @ApiResponse({ status: 200, description: '取消预留成功', type: Locker })
  cancelReserve(
    @Body() dto: ReserveLockerDto,
    @CurrentUser('id') userId: string,
  ): Promise<Locker> {
    return this.lockerService.cancelReserve(dto, userId);
  }

  @Post('force-clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '强制清柜（管理员）' })
  @ApiResponse({ status: 200, description: '清柜成功', type: Locker })
  forceClear(
    @Body() dto: ForceClearDto,
    @CurrentUser('id') adminId: string,
  ): Promise<Locker> {
    return this.lockerService.forceClear(dto, adminId);
  }

  @Post('set-faulty')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '标记故障（管理员）' })
  @ApiResponse({ status: 200, description: '标记成功', type: Locker })
  setFaulty(
    @Body() dto: SetFaultyDto,
    @CurrentUser('id') adminId: string,
  ): Promise<Locker> {
    return this.lockerService.setFaulty(dto, adminId);
  }

  @Post('repair')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '修复柜子（管理员）' })
  @ApiResponse({ status: 200, description: '修复成功', type: Locker })
  repairLocker(
    @Body() dto: RepairLockerDto,
    @CurrentUser('id') adminId: string,
  ): Promise<Locker> {
    return this.lockerService.repairLocker(dto, adminId);
  }

  @Post('check-overdue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '检查超时并提醒（管理员）' })
  @ApiResponse({ status: 200, description: '超时提醒的柜子数量' })
  checkOverdueAndRemind(): Promise<number> {
    return this.lockerService.checkOverdueAndRemind();
  }
}
