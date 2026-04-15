import type { ParentStudentLink } from '../entities/parent-student-link.entity';

export const PARENT_STUDENT_LINK_REPOSITORY = Symbol('PARENT_STUDENT_LINK_REPOSITORY');

export interface ParentStudentLinkRepository {
  save(link: ParentStudentLink): Promise<void>;
  findByParentAndStudent(parentUserId: string, studentId: string): Promise<ParentStudentLink | null>;
  findByParentUserId(parentUserId: string): Promise<ParentStudentLink[]>;
  findByStudentId(studentId: string): Promise<ParentStudentLink[]>;
  findByAcademyId(academyId: string): Promise<ParentStudentLink[]>;
  deleteByParentAndStudent(parentUserId: string, studentId: string): Promise<void>;
  deleteAllByParentUserId(parentUserId: string): Promise<number>;
}
