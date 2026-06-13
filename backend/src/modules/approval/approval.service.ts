import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approval, ApprovalStatus, ApprovalType } from '../../entities/approval.entity';
import { Ticket, TicketStatus } from '../../entities/ticket.entity';
import { User, UserRole } from '../../entities/user.entity';
import { LogService } from '../../common/services/log.service';
import { LogModule, LogAction } from '../../entities/operation-log.entity';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { QueryApprovalDto } from './dto/query-approval.dto';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(Approval)
    private approvalRepo: Repository<Approval>,
    @InjectRepository(Ticket)
    private ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private logService: LogService,
  ) {}

  async create(createApprovalDto: CreateApprovalDto, applicantId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: createApprovalDto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('票卡不存在');
    }

    if (ticket.status === TicketStatus.REFUNDING || ticket.status === TicketStatus.REFUNDED) {
      throw new BadRequestException('该票卡已在退款流程中或已退款');
    }

    const approval = this.approvalRepo.create({
      ...createApprovalDto,
      applicantId,
      status: ApprovalStatus.PENDING_FRONT_DESK,
    });

    const saved = await this.approvalRepo.save(approval);

    if (createApprovalDto.type === ApprovalType.REFUND) {
      await this.ticketRepo.update(ticket.id, { status: TicketStatus.REFUNDING });
    }

    await this.logService.record(
      LogModule.APPROVAL,
      LogAction.CREATE,
      `创建${createApprovalDto.type === ApprovalType.REFUND ? '退卡' : '换票'}审批申请`,
      applicantId,
      { approvalId: saved.id, ticketId: createApprovalDto.ticketId },
    );

    return this.findOne(saved.id);
  }

  async findAll(query: QueryApprovalDto) {
    const { page = 1, pageSize = 10, status, type } = query;

    const qb = this.approvalRepo
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.applicant', 'applicant')
      .leftJoinAndSelect('approval.ticket', 'ticket')
      .leftJoinAndSelect('approval.frontDeskApprover', 'frontDeskApprover')
      .leftJoinAndSelect('approval.managerApprover', 'managerApprover')
      .leftJoinAndSelect('approval.financeApprover', 'financeApprover')
      .orderBy('approval.createdAt', 'DESC');

    if (status) {
      qb.andWhere('approval.status = :status', { status });
    }

    if (type) {
      qb.andWhere('approval.type = :type', { type });
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const approval = await this.approvalRepo.findOne({
      where: { id },
      relations: ['applicant', 'ticket', 'frontDeskApprover', 'managerApprover', 'financeApprover'],
    });

    if (!approval) {
      throw new NotFoundException('审批记录不存在');
    }

    return approval;
  }

  async frontDeskApprove(id: string, approverId: string, remark?: string) {
    const approval = await this.findOne(id);

    if (approval.status !== ApprovalStatus.PENDING_FRONT_DESK) {
      throw new BadRequestException('当前状态不允许前台审核');
    }

    await this.approvalRepo.update(id, {
      status: ApprovalStatus.PENDING_MANAGER,
      frontDeskApproverId: approverId,
      frontDeskApprovedAt: new Date(),
      frontDeskRemark: remark,
    });

    await this.logService.record(
      LogModule.APPROVAL,
      LogAction.APPROVE,
      '前台审核通过',
      approverId,
      { approvalId: id },
    );

    return this.findOne(id);
  }

  async managerApprove(id: string, approverId: string, remark?: string) {
    const approval = await this.findOne(id);

    if (approval.status !== ApprovalStatus.PENDING_MANAGER) {
      throw new BadRequestException('当前状态不允许主管审核');
    }

    await this.approvalRepo.update(id, {
      status: ApprovalStatus.PENDING_FINANCE,
      managerApproverId: approverId,
      managerApprovedAt: new Date(),
      managerRemark: remark,
    });

    await this.logService.record(
      LogModule.APPROVAL,
      LogAction.APPROVE,
      '主管审核通过',
      approverId,
      { approvalId: id },
    );

    return this.findOne(id);
  }

  async financeApprove(id: string, approverId: string, remark?: string) {
    const approval = await this.findOne(id);

    if (approval.status !== ApprovalStatus.PENDING_FINANCE) {
      throw new BadRequestException('当前状态不允许财务确认');
    }

    await this.approvalRepo.update(id, {
      status: ApprovalStatus.APPROVED,
      financeApproverId: approverId,
      financeApprovedAt: new Date(),
      financeRemark: remark,
    });

    if (approval.type === ApprovalType.REFUND) {
      await this.ticketRepo.update(approval.ticketId, { status: TicketStatus.REFUNDED });
    }

    await this.logService.record(
      LogModule.APPROVAL,
      LogAction.APPROVE,
      '财务确认通过，审批完成',
      approverId,
      { approvalId: id },
    );

    return this.findOne(id);
  }

  async reject(id: string, rejectorId: string, remark: string) {
    const approval = await this.findOne(id);

    if (
      approval.status === ApprovalStatus.APPROVED ||
      approval.status === ApprovalStatus.REJECTED
    ) {
      throw new BadRequestException('审批已完成，无法拒绝');
    }

    const rejector = await this.userRepo.findOne({ where: { id: rejectorId } });

    const updateData: any = {
      status: ApprovalStatus.REJECTED,
    };

    if (rejector?.role === UserRole.FRONT_DESK || approval.status === ApprovalStatus.PENDING_FRONT_DESK) {
      updateData.frontDeskApproverId = rejectorId;
      updateData.frontDeskApprovedAt = new Date();
      updateData.frontDeskRemark = remark;
    } else if (rejector?.role === UserRole.MANAGER || approval.status === ApprovalStatus.PENDING_MANAGER) {
      updateData.managerApproverId = rejectorId;
      updateData.managerApprovedAt = new Date();
      updateData.managerRemark = remark;
    } else if (rejector?.role === UserRole.FINANCE || approval.status === ApprovalStatus.PENDING_FINANCE) {
      updateData.financeApproverId = rejectorId;
      updateData.financeApprovedAt = new Date();
      updateData.financeRemark = remark;
    }

    await this.approvalRepo.update(id, updateData);

    if (approval.type === ApprovalType.REFUND) {
      const ticket = await this.ticketRepo.findOne({ where: { id: approval.ticketId } });
      if (ticket && ticket.status === TicketStatus.REFUNDING) {
        await this.ticketRepo.update(approval.ticketId, { status: TicketStatus.ACTIVE });
      }
    }

    await this.logService.record(
      LogModule.APPROVAL,
      LogAction.REJECT,
      `审批被拒绝: ${remark}`,
      rejectorId,
      { approvalId: id },
    );

    return this.findOne(id);
  }
}
