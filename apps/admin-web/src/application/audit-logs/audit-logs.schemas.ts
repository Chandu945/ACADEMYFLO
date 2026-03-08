import { z } from 'zod';

const auditLogItemSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  actor: z.object({
    userId: z.string(),
    role: z.string().optional(),
    name: z.string().nullable(),
  }),
  actionType: z.string(),
  entity: z.object({
    type: z.string(),
    id: z.string().nullable(),
  }),
  context: z.record(z.unknown()).default({}),
});

const metaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const auditLogsResponseSchema = z.object({
  items: z.array(auditLogItemSchema),
  meta: metaSchema,
});
