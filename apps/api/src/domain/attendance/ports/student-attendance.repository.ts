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

  /**
   * Default-present model: count distinct students with at least one explicit
   * ABSENT record on a date. Mirrors the PRESENT version above. Drives the
   * dashboard "x of n scheduled present" tile so the metric defaults to 100%
   * (no ABSENT rows = nobody marked absent) and falls as absences accrue.
   */
  countDistinctStudentsAbsentByAcademyAndDate(
    academyId: string,
    date: string,
  ): Promise<number>;

  /**
   * All ABSENT records academy-wide in a month. Mirrors
   * `findPresentByAcademyAndMonth` so the monthly summary can compute the
   * per-day Present = scheduled_that_day − distinct_absent_that_day under
   * the default-present model.
   */
  findAbsentByAcademyAndMonth(
    academyId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]>;

  /** Cascade-delete all attendance records for a student. Returns count removed. */
  deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;
}
