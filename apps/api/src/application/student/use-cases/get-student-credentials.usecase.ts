import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { StudentErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetStudentCredentialsInput {
  actorUserId: string;
  actorRole: UserRole;
  studentId: string;
}

export interface StudentCredentialsOutput {
  studentName: string;
  loginId: string;
  loginIdType: 'MOBILE' | 'EMAIL';
  hasPassword: boolean;
  academyName: string;
  shareText: string;
}

export class GetStudentCredentialsUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
    private readonly academyRepo: AcademyRepository,
  ) {}

  async execute(input: GetStudentCredentialsInput): Promise<Result<StudentCredentialsOutput, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
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

    const academy = await this.academyRepo.findById(actor.academyId);
    const academyName = academy?.academyName ?? 'Academy';

    const loginId = student.guardian?.mobile || student.email || '';
    const loginIdType: 'MOBILE' | 'EMAIL' = student.guardian?.mobile ? 'MOBILE' : 'EMAIL';
    const hasPassword = false;

    let shareText: string;
    if (!loginId) {
      shareText = `${academyName}\n─────────────────\nStudent: ${student.fullName}\n\nLogin credentials have not been set up yet. Please contact the academy.`;
    } else {
      shareText = `${academyName}\n─────────────────\nStudent: ${student.fullName}\nLogin ID: ${loginId}\n\nPlease contact the academy for your password.`;
    }

    return ok({
      studentName: student.fullName,
      loginId,
      loginIdType,
      hasPassword,
      academyName,
      shareText,
    });
  }
}
