import { z } from 'zod';

export const dailyAttendanceItemSchema = z.object({
  studentId: z.string(),
  fullName: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'HOLIDAY']),
});

export const dailyAttendanceResponseSchema = z.object({
  date: z.string(),
  isHoliday: z.boolean(),
  data: z.array(dailyAttendanceItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const markAttendanceResponseSchema = z.object({
  studentId: z.string(),
  date: z.string(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

export const bulkSetAbsencesResponseSchema = z.object({
  date: z.string(),
  absentCount: z.number().int(),
});

export const dailyReportResponseSchema = z.object({
  date: z.string(),
  isHoliday: z.boolean(),
  presentCount: z.number().int(),
  absentCount: z.number().int(),
  absentStudents: z.array(
    z.object({
      studentId: z.string(),
      fullName: z.string(),
    }),
  ),
});

export const monthlySummaryItemSchema = z.object({
  studentId: z.string(),
  fullName: z.string(),
  presentCount: z.number().int(),
  absentCount: z.number().int(),
  holidayCount: z.number().int(),
});

export const monthlySummaryResponseSchema = z.object({
  data: z.array(monthlySummaryItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const studentMonthlyDetailResponseSchema = z.object({
  studentId: z.string(),
  month: z.string(),
  absentDates: z.array(z.string()),
  holidayDates: z.array(z.string()),
  presentCount: z.number().int(),
  absentCount: z.number().int(),
  holidayCount: z.number().int(),
});

export const monthDailyCountDaySchema = z.object({
  date: z.string(),
  absentCount: z.number().int(),
  isHoliday: z.boolean(),
});

export const monthDailyCountsResponseSchema = z.object({
  month: z.string(),
  totalStudents: z.number().int(),
  days: z.array(monthDailyCountDaySchema),
});

export const holidayItemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  date: z.string(),
  reason: z.string().nullable(),
  declaredByUserId: z.string(),
  createdAt: z.string(),
});

export const holidaysResponseSchema = z.array(holidayItemSchema);

export type DailyAttendanceApiResponse = z.infer<typeof dailyAttendanceResponseSchema>;
export type MarkAttendanceApiResponse = z.infer<typeof markAttendanceResponseSchema>;
export type BulkSetAbsencesApiResponse = z.infer<typeof bulkSetAbsencesResponseSchema>;
export type DailyReportApiResponse = z.infer<typeof dailyReportResponseSchema>;
export type MonthlySummaryApiResponse = z.infer<typeof monthlySummaryResponseSchema>;
export type StudentMonthlyDetailApiResponse = z.infer<typeof studentMonthlyDetailResponseSchema>;
export type MonthDailyCountsApiResponse = z.infer<typeof monthDailyCountsResponseSchema>;
export type HolidaysApiResponse = z.infer<typeof holidaysResponseSchema>;
