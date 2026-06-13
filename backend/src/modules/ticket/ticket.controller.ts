import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('票务管理')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(RolesGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('orders')
  @ApiOperation({ summary: '创建订单（售票）' })
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.CUSTOMER)
  createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    const userId = req.user?.id;
    const sellerId =
      req.user?.role === UserRole.CUSTOMER ? undefined : req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;
    return this.ticketService.createOrder(createOrderDto, userId, sellerId, ip);
  }

  @Post('verify')
  @ApiOperation({ summary: '核销票卡' })
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN)
  verifyTicket(@Body() verifyTicketDto: VerifyTicketDto, @Req() req) {
    const operatorId = req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;
    return this.ticketService.verifyTicket(verifyTicketDto, operatorId, ip);
  }

  @Get('my')
  @ApiOperation({ summary: '我的票卡列表' })
  @Roles(UserRole.CUSTOMER, UserRole.FRONT_DESK, UserRole.ADMIN)
  getMyTickets(@Query() query: QueryTicketDto, @Req() req) {
    const userId = req.user?.id;
    return this.ticketService.getMyTickets(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '票卡详情' })
  @Roles(UserRole.CUSTOMER, UserRole.FRONT_DESK, UserRole.ADMIN)
  getTicketDetail(@Param('id') id: string, @Req() req) {
    const userId =
      req.user?.role === UserRole.CUSTOMER ? req.user?.id : undefined;
    return this.ticketService.getTicketDetail(id, userId);
  }

  @Get(':id/usage-records')
  @ApiOperation({ summary: '票卡使用记录' })
  @Roles(UserRole.CUSTOMER, UserRole.FRONT_DESK, UserRole.ADMIN)
  getTicketUsageRecords(@Param('id') id: string) {
    return this.ticketService.getTicketUsageRecords(id);
  }

  @Get('orders/list')
  @ApiOperation({ summary: '订单列表' })
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.CUSTOMER)
  getOrderList(@Query() query: QueryOrderDto, @Req() req) {
    const userId =
      req.user?.role === UserRole.CUSTOMER ? req.user?.id : undefined;
    return this.ticketService.getOrderList(query, userId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '订单详情' })
  @Roles(UserRole.FRONT_DESK, UserRole.ADMIN, UserRole.CUSTOMER)
  getOrderDetail(@Param('id') id: string, @Req() req) {
    const userId =
      req.user?.role === UserRole.CUSTOMER ? req.user?.id : undefined;
    return this.ticketService.getOrderDetail(id, userId);
  }
}
