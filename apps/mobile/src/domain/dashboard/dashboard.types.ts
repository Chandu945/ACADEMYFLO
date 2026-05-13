export type OwnerDashboardRange =
  | { mode: 'preset'; preset: 'THIS_MONTH' }
  | { mode: 'custom'; from: string; to: string };

export type OwnerDashboardKpis = {
  totalActiveStudents: number;
  newAdmissions: number;
  inactiveStudents: number;
  pendingPaymentRequests: number;
  collectedAmount: number;
  totalPendingAmount: number;
  todayAbsentCount: number;
  dueStudentsCount: number;
  todayPresentCount: number;
  // Default-present model: scheduled = denominator of the attendance tile.
  // `null` when running against an older API build that doesn't yet return
  // the field — DashboardScreen falls back to present+absent in that case.
  todayScheduledCount: number | null;
  totalExpenses: number;
  lateFeeCollected: number;
  overdueCount: number;
  isHolidayToday: boolean;
};

export type MonthlyChartPoint = {
  month: string;
  income: number;
  expense: number;
};

export type MonthlyChartData = {
  year: number;
  data: MonthlyChartPoint[];
};

export type BirthdayStudent = {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  guardianMobile: string;
};

export type BirthdaysResult = {
  scope: 'today' | 'month';
  students: BirthdayStudent[];
};
