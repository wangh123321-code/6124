import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionService } from './admission.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInResponseDto } from './dto/check-in-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('入场管理')
@ApiBearerAuth()
@Controller('admission')
@UseGuards(RolesGuard)
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  @Post('check-in')
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.CUSTOMER)
  @ApiOperation({ summary: '用户入场（支持购票+核销+分配柜子一体化）' })
  @ApiResponse({ status: 200, description: '入场结果', type: CheckInResponseDto })
  checkIn(
    @Body() checkInDto: CheckInDto,
    @Req() req,
  ): Promise<CheckInResponseDto> {
    const userId = req.user?.id;
    const sellerId =
      req.user?.role === UserRole.CUSTOMER ? undefined : req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;
    return this.admissionService.checkIn(checkInDto, userId, sellerId, ip);
  }
}
