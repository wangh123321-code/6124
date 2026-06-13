import request from '../utils/request';
import {
  Locker,
  LockerStatus,
  LockerZone,
  LockerStatistics,
  ZoneStatistics,
  LockerLog,
} from '../types';

export enum OpenMethod {
  BLUETOOTH = 'bluetooth',
  PICKUP_CODE = 'pickup_code',
}

export interface OpenLockerParams {
  lockerNo: string;
  openMethod: OpenMethod;
  pickupCode?: string;
}

export const lockerApi = {
  getLockers: (params?: { zone?: LockerZone; status?: LockerStatus }) => {
    return request.get<any, Locker[]>('/lockers', { params });
  },

  getLockerStatistics: () => {
    return request.get<any, LockerStatistics>('/lockers/statistics');
  },

  getZoneStatistics: () => {
    return request.get<any, ZoneStatistics[]>('/lockers/zone-statistics');
  },

  getLockersByZone: (zone: LockerZone) => {
    return request.get<any, Locker[]>(`/lockers/zone/${zone}`);
  },

  getLockerByNo: (lockerNo: string) => {
    return request.get<any, Locker>(`/lockers/${lockerNo}`);
  },

  getLockerLogs: (lockerNo: string) => {
    return request.get<any, LockerLog[]>(`/lockers/${lockerNo}/logs`);
  },

  openLocker: (data: OpenLockerParams) => {
    return request.post<any, Locker>('/lockers/open', data);
  },

  closeLocker: (data: { lockerNo: string }) => {
    return request.post<any, Locker>('/lockers/close', data);
  },

  reserveLocker: (data: { lockerNo: string }) => {
    return request.post<any, Locker>('/lockers/reserve', data);
  },

  cancelReserve: (data: { lockerNo: string }) => {
    return request.post<any, Locker>('/lockers/cancel-reserve', data);
  },

  forceClear: (data: { lockerNo: string; reason?: string }) => {
    return request.post<any, Locker>('/lockers/force-clear', data);
  },

  setFaulty: (data: { lockerNo: string; remark?: string }) => {
    return request.post<any, Locker>('/lockers/set-faulty', data);
  },

  repairLocker: (data: { lockerNo: string; remark?: string }) => {
    return request.post<any, Locker>('/lockers/repair', data);
  },

  checkOverdue: () => {
    return request.post<any, number>('/lockers/check-overdue');
  },
};
