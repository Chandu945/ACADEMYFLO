export type OverdueStudentItem = {
  studentId: string;
  studentName: string;
  overdueMonths: number;
  totalBaseAmount: number;
  totalLateFee: number;
  totalPayable: number;
  oldestDueDate: string;
  daysOverdue: number;
};

export type OverdueStudentsResult = {
  items: OverdueStudentItem[];
  totalOverdueAmount: number;
  totalLateFees: number;
};
