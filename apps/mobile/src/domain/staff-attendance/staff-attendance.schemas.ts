import { z } from 'zod';

export const dailyStaffAttendanceItemSchema = z.object({
  staffUserId: z.string(),
  fullName: z.string(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

export const dailyStaffAttendanceResponseSchema = z.object({
  date: z.string(),
  isHoliday: z.boolean(),
  data: z.array(dailyStaffAttendanceItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const markStaffAttendanceResponseSchema = z.object({
  staffUserId: z.string(),
  date: z.string(),
  status: z.enum(['PRESENT', 'ABSENT']),
});

export const staffDailyReportResponseSchema = z.object({
  date: z.string(),
  isHoliday: z.boolean(),
  presentCount: z.number().int(),
  absentCount: z.number().int(),
  absentStaff: z.array(
    z.object({
      staffUserId: z.string(),
      fullName: z.string(),
    }),
  ),
});

export const monthlyStaffSummaryItemSchema = z.object({
  staffUserId: z.string(),
  fullName: z.string(),
  presentCount: z.number().int(),
  absentCount: z.number().int(),
  holidayCount: z.number().int(),
});

export const monthlyStaffSummaryResponseSchema = z.object({
  data: z.array(monthlyStaffSummaryItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type DailyStaffAttendanceApiResponse = z.infer<typeof dailyStaffAttendanceResponseSchema>;
export type MarkStaffAttendanceApiResponse = z.infer<typeof markStaffAttendanceResponseSchema>;
export type StaffDailyReportApiResponse = z.infer<typeof staffDailyReportResponseSchema>;
export type MonthlyStaffSummaryApiResponse = z.infer<typeof monthlyStaffSummaryResponseSchema>;
