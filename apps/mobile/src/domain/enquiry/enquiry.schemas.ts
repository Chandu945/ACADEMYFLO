import { z } from 'zod';

export const followUpSchema = z.object({
  id: z.string(),
  date: z.string(),
  notes: z.string(),
  nextFollowUpDate: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const enquiryListItemSchema = z.object({
  id: z.string(),
  prospectName: z.string(),
  mobileNumber: z.string(),
  interestedIn: z.string().nullable(),
  source: z.string().nullable(),
  status: z.string(),
  nextFollowUpDate: z.string().nullable(),
  followUpCount: z.number(),
  createdAt: z.string(),
});

export const enquiryListResponseSchema = z.object({
  data: z.array(enquiryListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const enquiryDetailSchema = z.object({
  id: z.string(),
  prospectName: z.string(),
  guardianName: z.string().nullable(),
  mobileNumber: z.string(),
  whatsappNumber: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  interestedIn: z.string().nullable(),
  source: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  closureReason: z.string().nullable(),
  convertedStudentId: z.string().nullable(),
  nextFollowUpDate: z.string().nullable(),
  followUps: z.array(followUpSchema),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const enquirySummarySchema = z.object({
  total: z.number(),
  active: z.number(),
  closed: z.number(),
  todayFollowUp: z.number(),
});

export type EnquiryListApiResponse = z.infer<typeof enquiryListResponseSchema>;
