import type { StaffAttendanceViewStatus } from '@playconnect/contracts';

export interface DailyStaffAttendanceViewItem {
  staffUserId: string;
  fullName: string;
  status: StaffAttendanceViewStatus;
}

export interface DailyStaffAttendanceReportDto {
  date: string;
  presentCount: number;
  absentCount: number;
  absentStaff: { staffUserId: string; fullName: string }[];
}

export interface MonthlyStaffAttendanceSummaryItem {
  staffUserId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
}
