export interface OwnerDashboardKpisDto {
  totalStudents: number;
  newAdmissions: number;
  inactiveStudents: number;
  pendingPaymentRequests: number;
  totalCollected: number;
  totalPendingAmount: number;
  todayAbsentCount: number;
  dueStudentsCount: number;
  todayPresentCount: number;
  /**
   * Default-present model: students who have a batch session today (active +
   * joined-on-or-before-today + enrolled in a batch whose `days` includes
   * today's weekday). 0 on declared holidays. Forms the denominator of the
   * "Student Marking Attendance" tile — `todayPresentCount / todayScheduledCount`
   * yields the % present, defaulting to 100% before anyone is marked absent.
   */
  todayScheduledCount: number;
  totalExpenses: number;
  lateFeeCollected: number;
  overdueCount: number;
  isHolidayToday: boolean;
}
