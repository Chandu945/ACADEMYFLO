export interface DailyAttendanceViewItem {
  studentId: string;
  fullName: string;
  status: 'PRESENT' | 'ABSENT' | 'HOLIDAY';
}

export interface DailyAttendanceReportDto {
  date: string;
  isHoliday: boolean;
  presentCount: number;
  absentCount: number;
  absentStudents: { studentId: string; fullName: string }[];
}

export interface StudentBatchAttendanceBreakdown {
  batchId: string;
  batchName: string;
  presentCount: number;
  expectedCount: number;
  presentDates: string[];
  absentDates: string[];
}

export interface StudentMonthlyAttendanceDto {
  studentId: string;
  month: string;
  /** Dates where the student missed at least one scheduled session. */
  absentDates: string[];
  holidayDates: string[];
  /** Total session-attendances across all batches the student is in. */
  presentCount: number;
  /** Total expected sessions minus presentCount (session-level absences). */
  absentCount: number;
  /** Sum across batches of scheduled-days-in-month minus holidays-on-scheduled-days. */
  expectedCount: number;
  holidayCount: number;
  perBatch: StudentBatchAttendanceBreakdown[];
}

export interface MonthlyAttendanceSummaryItem {
  studentId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  holidayCount: number;
}

export interface MonthDailyCountDay {
  date: string;
  absentCount: number;
  isHoliday: boolean;
}

export interface MonthDailyCountsDto {
  month: string;
  totalStudents: number;
  days: MonthDailyCountDay[];
}

export interface HolidayDto {
  id: string;
  academyId: string;
  date: string;
  reason: string | null;
  declaredByUserId: string;
  createdAt: Date;
}
