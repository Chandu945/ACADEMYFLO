import type { StudentAttendance } from '../entities/student-attendance.entity';

export const STUDENT_ATTENDANCE_REPOSITORY = Symbol('STUDENT_ATTENDANCE_REPOSITORY');

export interface StudentAttendanceRepository {
  save(record: StudentAttendance): Promise<void>;

  /** Mark a specific (student, batch, date) cell as ABSENT — deletes the present record. */
  deleteByAcademyStudentBatchDate(
    academyId: string,
    studentId: string,
    batchId: string,
    date: string,
  ): Promise<void>;

  /** Look up the present record for one (student, batch, date) cell. */
  findByAcademyStudentBatchDate(
    academyId: string,
    studentId: string,
    batchId: string,
    date: string,
  ): Promise<StudentAttendance | null>;

  /** All present records for a single batch on a date — drives the marking screen. */
  findPresentByAcademyBatchAndDate(
    academyId: string,
    batchId: string,
    date: string,
  ): Promise<StudentAttendance[]>;

  /** All present records for a date across every batch — academy-wide reporting. */
  findPresentByAcademyAndDate(academyId: string, date: string): Promise<StudentAttendance[]>;

  /** All present records for a student in a month, across every batch they're in. */
  findPresentByAcademyStudentAndMonth(
    academyId: string,
    studentId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]>;

  /** All present records academy-wide in a month — KPI aggregations. */
  findPresentByAcademyAndMonth(
    academyId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]>;

  /** Cascade-delete all batches' records for a single date (used when declaring a holiday). */
  deleteByAcademyAndDate(academyId: string, date: string): Promise<void>;

  /**
   * Count session-attendances (NOT students) on a date. A two-batch student
   * present in both batches counts twice — use {@link countDistinctStudentsPresentByAcademyAndDate}
   * for "students present today" KPIs instead.
   */
  countPresentByAcademyAndDate(academyId: string, date: string): Promise<number>;

  /** DB-side distinct count of students with at least one present record on a date. */
  countDistinctStudentsPresentByAcademyAndDate(
    academyId: string,
    date: string,
  ): Promise<number>;

  /** Cascade-delete all attendance records for a student. Returns count removed. */
  deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;
}
