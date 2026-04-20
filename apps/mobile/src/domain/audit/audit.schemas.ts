import { z } from 'zod';
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from '@academyflo/contracts';

export const auditLogItemSchema = z.object({
  id: z.string(),
  academyId: z.string(),
  actorUserId: z.string(),
  actorName: z.string().nullable(),
  action: z.enum(AUDIT_ACTION_TYPES),
  entityType: z.enum(AUDIT_ENTITY_TYPES),
  entityId: z.string(),
  context: z.record(z.string()).nullable(),
  createdAt: z.string(),
});

export const auditLogsResponseSchema = z.object({
  items: z.array(auditLogItemSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    totalItems: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type AuditLogsApiResponse = z.infer<typeof auditLogsResponseSchema>;
