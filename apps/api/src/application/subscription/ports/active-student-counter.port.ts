export const ACTIVE_STUDENT_COUNTER = Symbol('ACTIVE_STUDENT_COUNTER');

/**
 * Placeholder port for counting active students per academy.
 * Implementations will be provided once the Student module is built.
 */
export interface ActiveStudentCounterPort {
  countActiveStudents(academyId: string, asOfDate: Date): Promise<number>;
}
