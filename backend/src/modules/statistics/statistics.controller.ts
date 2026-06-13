import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('统计管理')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('today-overview')
  @ApiOperation({ summary: '今日数据概览' })
  getTodayOverview(@Req() req) {
    return this.statisticsService.getTodayOverview(req.user?.id);
  }

  @Get('visitor-flow')
  @ApiOperation({ summary: '今日客流曲线（按小时）' })
  getTodayVisitorFlow(@Req() req) {
    return this.statisticsService.getTodayVisitorFlow(req.user?.id);
  }

  @Get('locker-usage')
  @ApiOperation({ summary: '各时段柜子使用率（按小时）' })
  getLockerUsageByHour(@Req() req) {
    return this.statisticsService.getLockerUsageByHour(req.user?.id);
  }

  @Get('ticket-sales')
  @ApiOperation({ summary: '票卡销售占比' })
  getTicketSalesStats(@Req() req) {
    return this.statisticsService.getTicketSalesStats(req.user?.id);
  }

  @Get('locker-warning')
  @ApiOperation({ summary: '柜子使用率预警' })
  getLockerUsageWarning(@Req() req) {
    return this.statisticsService.getLockerUsageWarning(req.user?.id);
  }
}
