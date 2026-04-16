import type { Student } from '../entities/student.entity';
import type { StudentStatus } from '@playconnect/contracts';

export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');

export interface StudentListFilter {
  academyId: string;
  status?: StudentStatus;
  search?: string;
  studentIds?: string[];
}

export interface BirthdayStudent {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: Date;
  guardianMobile: string;
}

export interface StudentRepository {
  save(student: Student): Promise<void>;
  /**
   * CAS update: save the student only if the stored document's version matches
   * `expectedVersion`. Returns true on success, false if another writer won
   * (caller should treat this as a concurrency conflict and return 409).
   * Also requires the stored document to be non-deleted, so an edit cannot
   * resurrect a record that was soft-deleted concurrently.
   */
  saveWithVersionPrecondition(student: Student, expectedVersion: number): Promise<boolean>;
  findById(id: string): Promise<Student | null>;
  findByEmailInAcademy(academyId: string, email: string, excludeId?: string): Promise<Student | null>;
  findByPhoneInAcademy(academyId: string, phone: string, excludeId?: string): Promise<Student | null>;
  list(
    filter: StudentListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ students: Student[]; total: number }>;
  listActiveByAcademy(academyId: string): Promise<Student[]>;
  countActiveByAcademy(academyId: string): Promise<number>;
  findByIds(ids: string[]): Promise<Student[]>;
  countInactiveByAcademy(academyId: string): Promise<number>;
  countNewAdmissionsByAcademyAndDateRange(
    academyId: string,
    from: Date,
    to: Date,
  ): Promise<number>;
  findBirthdaysByAcademy(
    academyId: string,
    month: number,
    day?: number,
  ): Promise<BirthdayStudent[]>;
}
