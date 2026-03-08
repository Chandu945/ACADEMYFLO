/**
 * Soft delete fields contract.
 * Domain-safe: no framework dependencies.
 */
export interface SoftDeleteFields {
  readonly deletedAt: Date | null;
  readonly deletedBy: string | null;
}

export function initSoftDelete(): SoftDeleteFields {
  return {
    deletedAt: null,
    deletedBy: null,
  };
}

export function markDeleted(deletedBy: string): SoftDeleteFields {
  return {
    deletedAt: new Date(),
    deletedBy,
  };
}

export function isDeleted(fields: SoftDeleteFields): boolean {
  return fields.deletedAt !== null;
}
