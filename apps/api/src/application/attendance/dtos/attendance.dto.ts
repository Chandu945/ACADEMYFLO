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
  /** Distinct days the student was scheduled (union across batches), capped at
   *  joining date, per-batch enrollment dates, and today. The actionable
   *  headline metric for "how is this student doing" — always >= partialDays
   *  + presentDays + absentDays. */
  expectedDays: number;
  /** Days the student was present in at least one of their scheduled batches. */
  presentDays: number;
  /** Days the student was scheduled but present in NO batch. */
  absentDays: number;
  /** Days the student was present in some but not all of their scheduled
   *  batches (subset of presentDays — sub-state surfaced in the detail UI). */
  partialDays: number;
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
  /**
   * BUG-038: per-day count of active students who had joined the academy by
   * this date. The dashboard chart computes presentCount = expectedCount -
   * absentCount per day; using a single top-level totalStudents would
   * overcount Present for days before a student joined.
   */
  expectedCount: number;
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
  // ISO 8601 string — JSON wire format. Was `Date` historically, but JSON
  // serialization always produced an ISO string and mobile zod schemas
  // expect a string anyway. Declaring it as `string` here keeps the type
  // contract honest end-to-end.
  createdAt: string;
}
