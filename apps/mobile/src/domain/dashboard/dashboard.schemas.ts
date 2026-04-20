import { z } from 'zod';

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ownerDashboardApiSchema = z.object({
  totalStudents: z.number().int().min(0),
  newAdmissions: z.number().int().min(0),
  inactiveStudents: z.number().int().min(0),
  pendingPaymentRequests: z.number().int().min(0),
  totalCollected: z.number().min(0),
  totalPendingAmount: z.number().min(0),
  todayAbsentCount: z.number().int().min(0),
  dueStudentsCount: z.number().int().min(0),
  todayPresentCount: z.number().int().min(0),
  totalExpenses: z.number().min(0),
  lateFeeCollected: z.number().min(0),
  overdueCount: z.number().int().min(0),
  isHolidayToday: z.boolean(),
});

export type OwnerDashboardApiPayload = z.infer<typeof ownerDashboardApiSchema>;

export const dateRangeSchema = z
  .object({
    from: z.string().regex(LOCAL_DATE_RE, 'from must be YYYY-MM-DD'),
    to: z.string().regex(LOCAL_DATE_RE, 'to must be YYYY-MM-DD'),
  })
  .refine((d) => d.from <= d.to, { message: 'from must be <= to' });

export const monthlyChartPointSchema = z.object({
  month: z.string(),
  income: z.number(),
  expense: z.number(),
});

export const monthlyChartDataSchema = z.object({
  year: z.number().int(),
  data: z.array(monthlyChartPointSchema),
});

export const birthdayStudentSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  profilePhotoUrl: z.string().nullable(),
  dateOfBirth: z.string(),
  guardianMobile: z.string(),
});

export const birthdaysResultSchema = z.object({
  scope: z.enum(['today', 'month']),
  students: z.array(birthdayStudentSchema),
});
