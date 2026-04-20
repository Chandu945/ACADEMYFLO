import type { StudentAttendance } from '../entities/student-attendance.entity';

export const STUDENT_ATTENDANCE_REPOSITORY = Symbol('STUDENT_ATTENDANCE_REPOSITORY');

export interface StudentAttendanceRepository {
  save(record: StudentAttendance): Promise<void>;
  deleteByAcademyStudentDate(academyId: string, studentId: string, date: string): Promise<void>;
  findByAcademyStudentDate(
    academyId: string,
    studentId: string,
    date: string,
  ): Promise<StudentAttendance | null>;
  findPresentByAcademyAndDate(academyId: string, date: string): Promise<StudentAttendance[]>;
  findPresentByAcademyStudentAndMonth(
    academyId: string,
    studentId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]>;
  findPresentByAcademyAndMonth(academyId: string, monthPrefix: string): Promise<StudentAttendance[]>;
  deleteByAcademyAndDate(academyId: string, date: string): Promise<void>;
  countPresentByAcademyAndDate(academyId: string, date: string): Promise<number>;
  /** Cascade-delete all attendance records for a student. Returns count removed. */
  deleteAllByAcademyAndStudent(academyId: string, studentId: string): Promise<number>;
}
