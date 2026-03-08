/**
 * Audit fields for entity tracking.
 * Domain-safe: no framework dependencies.
 */
export interface AuditFields {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export function createAuditFields(): AuditFields {
  const now = new Date();
  return {
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function updateAuditFields(existing: AuditFields): AuditFields {
  return {
    createdAt: existing.createdAt,
    updatedAt: new Date(),
    version: existing.version + 1,
  };
}
