import type { AdminAcademyStatus } from '@academyflo/contracts';
import type { TierKey } from '@academyflo/contracts';

export type AcademyStatusFilter = AdminAcademyStatus;

export type TierFilter = TierKey;

export type AcademiesQuery = {
  status?: AcademyStatusFilter;
  tier?: TierFilter;
  search?: string;
  page: number;
  pageSize: number;
};

export type AcademyListRow = {
  academyId: string;
  academyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  status: AdminAcademyStatus;
  tierKey: TierKey | null;
  activeStudentCount: number | null;
  staffCount: number | null;
  thisMonthRevenueTotal: number | null;
  createdAt: string;
};

export type AcademiesListResult = {
  items: AcademyListRow[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
