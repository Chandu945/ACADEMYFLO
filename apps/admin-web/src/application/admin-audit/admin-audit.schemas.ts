import { z } from 'zod';

const itemSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  actor: z.object({
    userId: z.string(),
    name: z.string().nullable(),
  }),
  academy: z.object({
    id: z.string(),
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

export const adminAuditLogsResponseSchema = z.object({
  items: z.array(itemSchema),
  meta: metaSchema,
});

export type AdminAuditLogItem = z.infer<typeof itemSchema>;
export type AdminAuditLogsPayload = z.infer<typeof adminAuditLogsResponseSchema>;
