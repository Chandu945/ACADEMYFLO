import type { StaffAttendance } from '../entities/staff-attendance.entity';

export const STAFF_ATTENDANCE_REPOSITORY = Symbol('STAFF_ATTENDANCE_REPOSITORY');

export interface StaffAttendanceRepository {
  save(record: StaffAttendance): Promise<void>;
  deleteByAcademyStaffDate(academyId: string, staffUserId: string, date: string): Promise<void>;
  findAbsentByAcademyAndDate(academyId: string, date: string): Promise<StaffAttendance[]>;
  findAbsentByAcademyDateAndStaffIds(
    academyId: string,
    date: string,
    staffUserIds: string[],
  ): Promise<StaffAttendance[]>;
  findAbsentByAcademyAndMonth(academyId: string, monthPrefix: string): Promise<StaffAttendance[]>;
  countAbsentByAcademyStaffAndMonth(
    academyId: string,
    staffUserId: string,
    monthPrefix: string,
  ): Promise<number>;
}
