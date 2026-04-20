import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canManageStudent } from '@domain/student/rules/student.rules';
import { StudentErrors } from '../../common/errors';
import type { StudentDto } from '../dtos/student.dto';
import { toStudentDto } from '../dtos/student.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetStudentInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export class GetStudentUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
  ) {}

  async execute(input: GetStudentInput): Promise<Result<StudentDto, AppError>> {
    const roleCheck = canManageStudent(input.actorRole);
    if (!roleCheck.allowed) {
      return err(StudentErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) {
      return err(StudentErrors.academyRequired());
    }

    const student = await this.studentRepo.findById(input.studentId);
    if (!student || student.isDeleted()) {
      return err(StudentErrors.notFound(input.studentId));
    }

    if (student.academyId !== actor.academyId) {
      return err(StudentErrors.notInAcademy());
    }

    return ok(toStudentDto(student));
  }
}
