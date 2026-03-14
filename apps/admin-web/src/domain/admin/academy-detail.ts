import type { AdminAcademyStatus, TierKey } from '@playconnect/contracts';

export type AcademyOwner = {
  fullName: string;
  email: string;
  phoneNumber: string;
  profilePhotoUrl?: string | null;
};

export type AcademySubscription = {
  status: AdminAcademyStatus;
  tierKey: TierKey | null;
  pendingTierKey: TierKey | null;
  pendingTierEffectiveAt: string | null;
  trialEndAt: string | null;
  paidStartAt: string | null;
  paidEndAt: string | null;
  manualNotes: string | null;
  paymentReference: string | null;
};

export type AcademyMetrics = {
  activeStudentCount: number;
  staffCount: number;
  thisMonthRevenueTotal: number;
};

export type AdminAcademyDetail = {
  academyId: string;
  academyName: string;
  loginDisabled: boolean;
  owner: AcademyOwner;
  subscription: AcademySubscription;
  metrics: AcademyMetrics;
};

export type ManualSubscriptionInput = {
  tierKey: TierKey;
  paidStartAt: string;
  paidEndAt: string;
  manualNotes?: string;
  paymentReference?: string;
};

export type ResetPasswordResult = {
  temporaryPassword: string;
};
