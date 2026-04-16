/**
 * Thrown by repositories when an optimistic-concurrency CAS fails —
 * i.e. another writer modified the entity between read and save.
 *
 * Caller contract:
 *   - Infrastructure (repos) throw this when a version-filtered update
 *     returns no document.
 *   - GlobalExceptionFilter maps it to HTTP 409 Conflict with a stable
 *     error code so clients / metrics can distinguish it from 500s.
 *   - Transactional callers may also be retried automatically by
 *     MongoTransactionService if the underlying cause is a Mongo
 *     TransientTransactionError; this typed error is for the explicit
 *     version-check branch that isn't labelled transient by the driver.
 */
export class ConcurrentModificationError extends Error {
  readonly entityType: string;

  constructor(entityType: string) {
    super(`Concurrent modification detected for ${entityType}`);
    this.name = 'ConcurrentModificationError';
    this.entityType = entityType;
  }
}
