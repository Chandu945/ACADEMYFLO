/**
 * Port for distributed job locking.
 * Ensures only one instance runs a given job at a time across replicas.
 */
export interface JobLockPort {
  /**
   * Acquire a lock for `jobName`, execute `fn`, then release.
   * @returns `{ ran: true }` if lock acquired and `fn` executed; `{ ran: false }` if another instance holds the lock.
   */
  withLock(
    jobName: string,
    ttlMs: number,
    fn: () => Promise<void>,
  ): Promise<{ ran: boolean }>;
}

export const JOB_LOCK_PORT = Symbol('JOB_LOCK_PORT');
