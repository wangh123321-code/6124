import { Injectable } from '@nestjs/common';
import { MemberLevel } from '../../entities/user.entity';
import { LockerZone } from '../../entities/locker.entity';

export interface MemberPrivilege {
  memberLevel: MemberLevel;
  lockerZones: LockerZone[];
  maxPositionInZone: number;
  freeLockerHours: number;
  vipLockerAccess: boolean;
}

export const MEMBER_PRIVILEGES: Record<MemberLevel, MemberPrivilege> = {
  [MemberLevel.NORMAL]: {
    memberLevel: MemberLevel.NORMAL,
    lockerZones: [LockerZone.C, LockerZone.D],
    maxPositionInZone: 100,
    freeLockerHours: 2,
    vipLockerAccess: false,
  },
  [MemberLevel.SILVER]: {
    memberLevel: MemberLevel.SILVER,
    lockerZones: [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D],
    maxPositionInZone: 50,
    freeLockerHours: 4,
    vipLockerAccess: true,
  },
  [MemberLevel.GOLD]: {
    memberLevel: MemberLevel.GOLD,
    lockerZones: [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D],
    maxPositionInZone: 50,
    freeLockerHours: 6,
    vipLockerAccess: true,
  },
  [MemberLevel.DIAMOND]: {
    memberLevel: MemberLevel.DIAMOND,
    lockerZones: [LockerZone.A, LockerZone.B, LockerZone.C, LockerZone.D],
    maxPositionInZone: 50,
    freeLockerHours: 24,
    vipLockerAccess: true,
  },
};

export const VIP_ZONES = [LockerZone.A, LockerZone.B];
export const VIP_MAX_POSITION = 50;
export const NORMAL_ZONES = [LockerZone.C, LockerZone.D];

@Injectable()
export class MemberService {
  getPrivilege(memberLevel: MemberLevel): MemberPrivilege {
    return MEMBER_PRIVILEGES[memberLevel] || MEMBER_PRIVILEGES[MemberLevel.NORMAL];
  }

  canAccessZone(memberLevel: MemberLevel, zone: LockerZone, position: number): boolean {
    const privilege = this.getPrivilege(memberLevel);
    if (!privilege.lockerZones.includes(zone)) {
      return false;
    }
    if (VIP_ZONES.includes(zone) && position > VIP_MAX_POSITION) {
      return privilege.vipLockerAccess;
    }
    return true;
  }

  isVipZone(zone: LockerZone): boolean {
    return VIP_ZONES.includes(zone);
  }

  isVipMember(memberLevel: MemberLevel): boolean {
    return this.getPrivilege(memberLevel).vipLockerAccess;
  }

  getFreeLockerHours(memberLevel: MemberLevel): number {
    return this.getPrivilege(memberLevel).freeLockerHours;
  }

  getAllowedZones(memberLevel: MemberLevel): LockerZone[] {
    return this.getPrivilege(memberLevel).lockerZones;
  }

  getVipZones(): LockerZone[] {
    return VIP_ZONES;
  }

  getNormalZones(): LockerZone[] {
    return NORMAL_ZONES;
  }

  compareLevel(level1: MemberLevel, level2: MemberLevel): number {
    const levelOrder = [MemberLevel.NORMAL, MemberLevel.SILVER, MemberLevel.GOLD, MemberLevel.DIAMOND];
    return levelOrder.indexOf(level1) - levelOrder.indexOf(level2);
  }

  isHigherLevel(level1: MemberLevel, level2: MemberLevel): boolean {
    return this.compareLevel(level1, level2) > 0;
  }

  isLowerLevel(level1: MemberLevel, level2: MemberLevel): boolean {
    return this.compareLevel(level1, level2) < 0;
  }
}
