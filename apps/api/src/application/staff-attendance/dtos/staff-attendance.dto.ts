import type { StaffAttendanceViewStatus } from '@academyflo/contracts';

export interface DailyStaffAttendanceViewItem {
  staffUserId: string;
  fullName: string;
  status: StaffAttendanceViewStatus;
}

export interface DailyStaffAttendanceReportDto {
  date: string;
  isHoliday: boolean;
  presentCount: number;
  absentCount: number;
  absentStaff: { staffUserId: string; fullName: string }[];
}

export interface MonthlyStaffAttendanceSummaryItem {
  staffUserId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  holidayCount: number;
}

export interface StaffMonthlyAttendanceDto {
  staffUserId: string;
  fullName: string;
  month: string;
  /** Day-level metrics. Staff attendance is per-day (no batch sessions). */
  expectedDays: number;
  presentDays: number;
  absentDays: number;
  holidayCount: number;
  /** Distinct dates the staff was present in the month (capped to today). */
  presentDates: string[];
  /** Elapsed expected dates (excluding holidays) where staff was not present. */
  absentDates: string[];
  /** Past holiday dates in the month. */
  holidayDates: string[];
}
