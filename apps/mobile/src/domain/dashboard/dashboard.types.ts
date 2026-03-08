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
  totalExpenses: number;
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
