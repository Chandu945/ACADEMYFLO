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

export interface StudentMonthlyAttendanceDto {
  studentId: string;
  month: string;
  absentDates: string[];
  holidayDates: string[];
  presentCount: number;
  absentCount: number;
  holidayCount: number;
}

export interface MonthlyAttendanceSummaryItem {
  studentId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  holidayCount: number;
}

export interface HolidayDto {
  id: string;
  academyId: string;
  date: string;
  reason: string | null;
  declaredByUserId: string;
  createdAt: Date;
}
