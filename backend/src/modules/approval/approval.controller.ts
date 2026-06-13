import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { QueryApprovalDto } from './dto/query-approval.dto';
import { ApproveApprovalDto } from './dto/approve-approval.dto';
import { RejectApprovalDto } from './dto/reject-approval.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('审批管理')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(RolesGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post()
  @ApiOperation({ summary: '创建审批申请' })
  create(@Body() createApprovalDto: CreateApprovalDto, @Req() req) {
    return this.approvalService.create(createApprovalDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取审批列表' })
  findAll(@Query() query: QueryApprovalDto) {
    return this.approvalService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取审批详情' })
  findOne(@Param('id') id: string) {
    return this.approvalService.findOne(id);
  }

  @Post(':id/front-desk/approve')
  @ApiOperation({ summary: '前台审核通过' })
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN)
  frontDeskApprove(
    @Param('id') id: string,
    @Body() dto: ApproveApprovalDto,
    @Req() req,
  ) {
    return this.approvalService.frontDeskApprove(id, req.user.id, dto.remark);
  }

  @Post(':id/manager/approve')
  @ApiOperation({ summary: '主管审核通过' })
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  managerApprove(
    @Param('id') id: string,
    @Body() dto: ApproveApprovalDto,
    @Req() req,
  ) {
    return this.approvalService.managerApprove(id, req.user.id, dto.remark);
  }

  @Post(':id/finance/approve')
  @ApiOperation({ summary: '财务确认通过' })
  @Roles(UserRole.FINANCE, UserRole.ADMIN)
  financeApprove(
    @Param('id') id: string,
    @Body() dto: ApproveApprovalDto,
    @Req() req,
  ) {
    return this.approvalService.financeApprove(id, req.user.id, dto.remark);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '拒绝审批' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectApprovalDto,
    @Req() req,
  ) {
    return this.approvalService.reject(id, req.user.id, dto.remark);
  }
}
