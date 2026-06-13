export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  FINANCE = 'finance',
  FRONT_DESK = 'front_desk',
  CUSTOMER = 'customer',
}

export interface User {
  id: string;
  username: string;
  name: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum TicketType {
  SINGLE = 'single',
  TIMES_CARD = 'times_card',
  MONTHLY_CARD = 'monthly_card',
}

export enum TicketStatus {
  ACTIVE = 'active',
  USED_UP = 'used_up',
  EXPIRED = 'expired',
  REFUNDING = 'refunding',
  REFUNDED = 'refunded',
}

export interface Ticket {
  id: string;
  type: TicketType;
  name: string;
  price: number;
  totalTimes?: number;
  usedTimes: number;
  validDays?: number;
  expireAt?: string;
  status: TicketStatus;
  qrCode?: string;
  pickupCode?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface Order {
  id: string;
  orderNo: string;
  amount: number;
  status: OrderStatus;
  ticketType: TicketType;
  ticketName: string;
  userId: string;
  ticketId: string;
  sellerId?: string;
  paymentMethod: string;
  createdAt: string;
}

export enum LockerStatus {
  FREE = 'free',
  IN_USE = 'in_use',
  RESERVED = 'reserved',
  FAULTY = 'faulty',
}

export enum LockerZone {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export interface Locker {
  id: string;
  lockerNo: string;
  zone: LockerZone;
  position: number;
  status: LockerStatus;
  usedAt?: string;
  pickupCode?: string;
  isOverdueReminded: boolean;
  currentUserId?: string;
  ticketId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LockerStatistics {
  total: number;
  free: number;
  inUse: number;
  reserved: number;
  faulty: number;
  overdue: number;
}

export interface ZoneStatistics {
  zone: LockerZone;
  total: number;
  free: number;
  inUse: number;
  reserved: number;
  faulty: number;
}

export enum ApprovalType {
  REFUND = 'refund',
  EXCHANGE = 'exchange',
}

export enum ApprovalStatus {
  PENDING_FRONT_DESK = 'pending_front_desk',
  PENDING_MANAGER = 'pending_manager',
  PENDING_FINANCE = 'pending_finance',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Approval {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  refundAmount?: number;
  reason?: string;
  ticketId: string;
  applicantId: string;
  frontDeskApproverId?: string;
  frontDeskApprovedAt?: string;
  frontDeskRemark?: string;
  managerApproverId?: string;
  managerApprovedAt?: string;
  managerRemark?: string;
  financeApproverId?: string;
  financeApprovedAt?: string;
  financeRemark?: string;
  createdAt: string;
  updatedAt: string;
  applicant?: User;
  ticket?: Ticket;
  frontDeskApprover?: User;
  managerApprover?: User;
  financeApprover?: User;
}

export interface VisitorFlowItem {
  hour: number;
  count: number;
}

export interface LockerUsageItem {
  hour: number;
  openCount: number;
  totalLockers: number;
  usageRate: number;
  isWarning: boolean;
}

export interface TicketSalesItem {
  ticketType: TicketType;
  ticketName: string;
  salesCount: number;
  totalAmount: number;
  countRatio: number;
  amountRatio: number;
}

export interface TicketSalesStats {
  list: TicketSalesItem[];
  totalSales: number;
  totalAmount: number;
}

export interface LockerWarning {
  totalLockers: number;
  inUseLockers: number;
  usageRate: number;
  isWarning: boolean;
  warningThreshold: number;
}

export interface TodayOverview {
  visitor: {
    todayCount: number;
  };
  sales: {
    todayOrders: number;
    todayAmount: number;
  };
  locker: {
    total: number;
    inUse: number;
    free: number;
    usageRate: number;
    isWarning: boolean;
  };
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export enum LockerLogAction {
  OPEN = 'open',
  CLOSE = 'close',
  RESERVE = 'reserve',
  CANCEL_RESERVE = 'cancel_reserve',
  FORCE_CLEAR = 'force_clear',
  SET_FAULTY = 'set_faulty',
  REPAIR = 'repair',
}

export interface LockerLog {
  id: string;
  action: LockerLogAction;
  remark?: string;
  lockerId: string;
  operatorId?: string;
  openMethod?: string;
  createdAt: string;
}

export interface TicketUsageRecord {
  id: string;
  ticketId: string;
  userId: string;
  lockerId?: string;
  timesUsed: number;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
}
