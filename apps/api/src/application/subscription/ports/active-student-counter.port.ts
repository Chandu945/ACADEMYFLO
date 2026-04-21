export const ACTIVE_STUDENT_COUNTER = Symbol('ACTIVE_STUDENT_COUNTER');

export interface ActiveStudentCounterPort {
  countActiveStudents(academyId: string, asOfDate: Date): Promise<number>;

  /**
   * Count active students whose record has existed for at least `gracePeriodMs`
   * as of `asOfDate`. Used for peak-based tier billing so transient
   * add-then-remove (e.g. a typo corrected within minutes) doesn't raise the
   * peak. A student created less than `gracePeriodMs` ago is excluded from
   * this count.
   */
  countEligibleStudents(
    academyId: string,
    asOfDate: Date,
    gracePeriodMs: number,
  ): Promise<number>;
}
