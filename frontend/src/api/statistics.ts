import request from '../utils/request';
import {
  VisitorFlowItem,
  LockerUsageItem,
  TicketSalesStats,
  LockerWarning,
  TodayOverview,
} from '../types';

export const statisticsApi = {
  getTodayOverview: () => {
    return request.get<any, TodayOverview>('/statistics/today-overview');
  },

  getVisitorFlow: () => {
    return request.get<any, VisitorFlowItem[]>('/statistics/visitor-flow');
  },

  getLockerUsageByHour: () => {
    return request.get<any, LockerUsageItem[]>('/statistics/locker-usage');
  },

  getTicketSalesStats: () => {
    return request.get<any, TicketSalesStats>('/statistics/ticket-sales');
  },

  getLockerWarning: () => {
    return request.get<any, LockerWarning>('/statistics/locker-warning');
  },
};
