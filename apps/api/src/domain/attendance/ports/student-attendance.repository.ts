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
  findAbsentByAcademyAndDate(academyId: string, date: string): Promise<StudentAttendance[]>;
  findAbsentByAcademyStudentAndMonth(
    academyId: string,
    studentId: string,
    monthPrefix: string,
  ): Promise<StudentAttendance[]>;
  findAbsentByAcademyAndMonth(academyId: string, monthPrefix: string): Promise<StudentAttendance[]>;
  deleteByAcademyAndDate(academyId: string, date: string): Promise<void>;
  countAbsentByAcademyAndDate(academyId: string, date: string): Promise<number>;
}
