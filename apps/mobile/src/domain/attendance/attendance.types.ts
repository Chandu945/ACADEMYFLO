export type LocalDate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type AttendanceDisplayStatus = 'PRESENT' | 'ABSENT' | 'HOLIDAY';

export type DailyAttendanceItem = {
  studentId: string;
  fullName: string;
  status: AttendanceDisplayStatus;
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

export type MarkAttendanceRequest = {
  status: AttendanceStatus;
};

export type MarkAttendanceResult = {
  studentId: string;
  date: string;
  status: AttendanceStatus;
};

export type BulkSetAbsencesRequest = {
  absentStudentIds: string[];
};

export type BulkSetAbsencesResult = {
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

export type StudentMonthlyDetail = {
  studentId: string;
  month: string;
  absentDates: string[];
  holidayDates: string[];
  presentCount: number;
  absentCount: number;
  holidayCount: number;
};

export type HolidayItem = {
  id: string;
  academyId: string;
  date: string;
  reason: string | null;
  declaredByUserId: string;
  createdAt: string;
};
