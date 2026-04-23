export type { LocalDate, MonthKey } from '@academyflo/contracts';
import type { StudentAttendanceStatus } from '@academyflo/contracts';

export type AttendanceStatus = StudentAttendanceStatus;

export type DailyAttendanceItem = {
  studentId: string;
  fullName: string;
  status: AttendanceStatus | 'HOLIDAY';
};

export type DailyAttendancePage = {
  date: string;
  isHoliday: boolean;
  items: DailyAttendanceItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type MarkAttendanceResult = {
  studentId: string;
  batchId: string;
  date: string;
  status: AttendanceStatus;
};

export type BulkSetAbsencesResult = {
  batchId: string;
  date: string;
  absentCount: number;
};

export type DailyReportResult = {
  date: string;
  isHoliday: boolean;
  presentCount: number;
  absentCount: number;
  absentStudents: { studentId: string; fullName: string }[];
};

export type MonthlySummaryItem = {
  studentId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  holidayCount: number;
};

export type MonthlySummaryPage = {
  items: MonthlySummaryItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type StudentBatchAttendanceBreakdown = {
  batchId: string;
  batchName: string;
  presentCount: number;
  expectedCount: number;
  presentDates: string[];
  absentDates: string[];
};

export type StudentMonthlyDetail = {
  studentId: string;
  month: string;
  absentDates: string[];
  holidayDates: string[];
  presentCount: number;
  absentCount: number;
  expectedCount: number;
  holidayCount: number;
  perBatch: StudentBatchAttendanceBreakdown[];
};

export type HolidayItem = {
  id: string;
  academyId: string;
  date: string;
  reason: string | null;
  declaredByUserId: string;
  createdAt: string;
};
