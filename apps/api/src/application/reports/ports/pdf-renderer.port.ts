import type { MonthlyRevenueSummaryDto } from '../dtos/monthly-revenue.dto';
import type { StudentWiseDueItemDto } from '../dtos/student-wise-dues.dto';

export const PDF_RENDERER = Symbol('PDF_RENDERER');

export interface StudentMonthlyAttendancePdfInput {
  studentName: string;
  month: string;
  expectedDays: number;
  presentDays: number;
  absentDays: number;
  partialDays: number;
  holidayCount: number;
  perBatch: { batchName: string; expectedCount: number; presentCount: number }[];
  absentDates: string[];
  holidayDates: string[];
}

export interface MonthlyAttendanceSummaryPdfRow {
  fullName: string;
  expectedDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number | null;
}

export interface MonthlyAttendanceSummaryPdfInput {
  academyName: string;
  month: string;
  rows: MonthlyAttendanceSummaryPdfRow[];
}

export interface PdfRenderer {
  renderMonthlyRevenue(month: string, data: MonthlyRevenueSummaryDto): Promise<Buffer>;
  renderPendingDues(month: string, items: StudentWiseDueItemDto[]): Promise<Buffer>;
  renderStudentMonthlyAttendance(input: StudentMonthlyAttendancePdfInput): Promise<Buffer>;
  renderMonthlyAttendanceSummary(input: MonthlyAttendanceSummaryPdfInput): Promise<Buffer>;
}
