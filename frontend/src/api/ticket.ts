import request from '../utils/request';
import {
  Ticket,
  Order,
  PaginatedResponse,
  TicketType,
  TicketStatus,
  OrderStatus,
  TicketUsageRecord,
} from '../types';

export interface CreateOrderParams {
  ticketType: TicketType;
  ticketName: string;
  totalTimes?: number;
  validDays?: number;
  amount?: number;
  paymentMethod?: string;
}

export const ticketApi = {
  createOrder: (data: CreateOrderParams) => {
    return request.post<any, { order: Order; ticket: Ticket }>('/tickets/orders', data);
  },

  verifyTicket: (data: { ticketId?: string; qrCode?: string; pickupCode?: string; lockerId?: string }) => {
    return request.post<any, { ticket: Ticket; record: TicketUsageRecord }>('/tickets/verify', data);
  },

  getMyTickets: (params?: { type?: TicketType; status?: TicketStatus; page?: number; pageSize?: number }) => {
    return request.get<any, PaginatedResponse<Ticket>>('/tickets/my', { params });
  },

  getTicketDetail: (id: string) => {
    return request.get<any, Ticket>(`/tickets/${id}`);
  },

  getTicketUsageRecords: (id: string) => {
    return request.get<any, TicketUsageRecord[]>(`/tickets/${id}/usage-records`);
  },

  getOrderList: (params?: { status?: OrderStatus; ticketType?: TicketType; page?: number; pageSize?: number }) => {
    return request.get<any, PaginatedResponse<Order>>('/tickets/orders/list', { params });
  },

  getOrderDetail: (id: string) => {
    return request.get<any, Order>(`/tickets/orders/${id}`);
  },
};
