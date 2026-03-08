export type StaffAttendanceStatus = 'PRESENT' | 'ABSENT';

export type DailyStaffAttendanceItem = {
  staffUserId: string;
  fullName: string;
  status: StaffAttendanceStatus;
};

export type DailyStaffAttendancePage = {
  date: string;
  items: DailyStaffAttendanceItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type MarkStaffAttendanceResult = {
  staffUserId: string;
  date: string;
  status: StaffAttendanceStatus;
};

export type DailyStaffReportResult = {
  date: string;
  presentCount: number;
  absentCount: number;
  absentStaff: { staffUserId: string; fullName: string }[];
};

export type MonthlyStaffSummaryItem = {
  staffUserId: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
};

export type MonthlyStaffSummaryPage = {
  items: MonthlyStaffSummaryItem[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
