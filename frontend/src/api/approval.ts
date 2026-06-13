import request from '../utils/request';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  PaginatedResponse,
} from '../types';

export interface CreateApprovalParams {
  type: ApprovalType;
  ticketId: string;
  refundAmount?: number;
  reason?: string;
}

export const approvalApi = {
  createApproval: (data: CreateApprovalParams) => {
    return request.post<any, Approval>('/approvals', data);
  },

  getApprovalList: (params?: { status?: ApprovalStatus; type?: ApprovalType; page?: number; pageSize?: number }) => {
    return request.get<any, PaginatedResponse<Approval> & { list: Approval[] }>('/approvals', { params });
  },

  getApprovalDetail: (id: string) => {
    return request.get<any, Approval>(`/approvals/${id}`);
  },

  frontDeskApprove: (id: string, remark?: string) => {
    return request.post<any, Approval>(`/approvals/${id}/front-desk/approve`, { remark });
  },

  managerApprove: (id: string, remark?: string) => {
    return request.post<any, Approval>(`/approvals/${id}/manager/approve`, { remark });
  },

  financeApprove: (id: string, remark?: string) => {
    return request.post<any, Approval>(`/approvals/${id}/finance/approve`, { remark });
  },

  rejectApproval: (id: string, remark: string) => {
    return request.post<any, Approval>(`/approvals/${id}/reject`, { remark });
  },
};
