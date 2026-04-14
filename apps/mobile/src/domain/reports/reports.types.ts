export type MonthlyRevenueItem = {
  id: string;
  studentId: string;
  monthKey: string;
  amount: number;
  source: string;
  receiptNumber: string;
  collectedByUserId: string | null;
  approvedByUserId: string | null;
  createdAt: string;
};

export type MonthlyRevenueSummary = {
  totalAmount: number;
  transactionCount: number;
  transactions: MonthlyRevenueItem[];
};

export type StudentWiseDueItem = {
  studentId: string;
  studentName: string;
  monthKey: string;
  amount: number;
  status: string;
  pendingMonthsCount: number;
  totalPendingAmount: number;
};

export type MonthWiseDueItem = {
  id: string;
  studentId: string;
  studentName: string;
  monthKey: string;
  dueDate: string;
  amount: number;
  status: string;
  paidAt: string | null;
  paidSource: string | null;
};

export type MonthWiseDuesSummary = {
  month: string;
  totalDues: number;
  paidCount: number;
  unpaidCount: number;
  paidAmount: number;
  unpaidAmount: number;
  dues: MonthWiseDueItem[];
};
