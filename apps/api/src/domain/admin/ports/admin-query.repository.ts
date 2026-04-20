import type { AdminAcademyStatus, TierKey } from '@academyflo/contracts';

export const ADMIN_QUERY_REPOSITORY = Symbol('ADMIN_QUERY_REPOSITORY');

export interface DashboardTiles {
  totalAcademies: number;
  trialAcademies: number;
  paidAcademies: number;
  expiredGraceAcademies: number;
  blockedAcademies: number;
  disabledAcademies: number;
}

export interface AdminAcademiesFilter {
  page: number;
  pageSize: number;
  status?: AdminAcademyStatus;
  search?: string;
  tierKey?: TierKey;
}

export interface AcademyListRow {
  academyId: string;
  academyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: AdminAcademyStatus;
  tierKey: TierKey | null;
  activeStudentCount: number;
  staffCount: number;
  thisMonthRevenueTotal: number;
  createdAt: Date;
}

export interface AcademyDetail {
  academyId: string;
  academyName: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  loginDisabled: boolean;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerProfilePhotoUrl: string | null;
  subscription: {
    id: string;
    status: AdminAcademyStatus;
    trialStartAt: Date;
    trialEndAt: Date;
    paidStartAt: Date | null;
    paidEndAt: Date | null;
    tierKey: TierKey | null;
    pendingTierKey: TierKey | null;
    pendingTierEffectiveAt: Date | null;
    manualNotes: string | null;
    paymentReference: string | null;
  } | null;
  studentCount: number;
  staffCount: number;
  revenueThisMonth: number;
  createdAt: Date;
}

export interface AdminQueryRepository {
  getDashboardTiles(now: Date): Promise<DashboardTiles>;
  listAcademies(
    filter: AdminAcademiesFilter,
    now: Date,
  ): Promise<{ items: AcademyListRow[]; total: number }>;
  getAcademyDetail(academyId: string, now: Date): Promise<AcademyDetail | null>;
}
