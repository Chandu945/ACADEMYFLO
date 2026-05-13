import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { StudentRepository } from '@domain/student/ports/student.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { StudentErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';
import { randomUUID } from 'crypto';

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
    private readonly parentLinkRepo: ParentStudentLinkRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    input: GetStudentCredentialsInput,
  ): Promise<Result<StudentCredentialsOutput, AppError>> {
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

    // Find linked parent user
    const links = await this.parentLinkRepo.findByStudentId(input.studentId);
    const parentLink = links[0]; // first linked parent
    const parentUser = parentLink ? await this.userRepo.findById(parentLink.parentUserId) : null;

    const loginId = parentUser?.emailNormalized || student.email || '';
    const loginIdType: 'MOBILE' | 'EMAIL' = 'EMAIL';

    let shareText: string;
    if (!parentUser || !loginId) {
      // No parent account — tell owner to invite first
      shareText = `${academyName}\n─────────────────\nStudent: ${student.fullName}\n\nNo parent login has been created yet. Please use "Invite Parent" first.`;

      return ok({
        studentName: student.fullName,
        loginId,
        loginIdType,
        hasPassword: false,
        academyName,
        shareText,
      });
    }

    // Generate a new temporary password and reset the parent's password.
    //
    // L3b fix (mirrors L3 in invite-parent): the prior 8-hex-char password
    // (32 bits of entropy) was brute-forceable on modern hardware. 16 hex
    // chars from randomUUID gives 64 bits — safe in the one-time-use window
    // before the parent logs in and resets.
    const tempPassword = randomUUID().replace(/-/g, '').slice(0, 16);
    const passwordHash = await this.passwordHasher.hash(tempPassword);
    const updatedUser = parentUser.changePassword(passwordHash);
    await this.userRepo.save(updatedUser);

    shareText = `${academyName}\n─────────────────\nStudent: ${student.fullName}\nLogin ID: ${loginId}\nPassword: ${tempPassword}\n\nPlease change your password after first login.`;

    return ok({
      studentName: student.fullName,
      loginId,
      loginIdType,
      hasPassword: true,
      academyName,
      shareText,
    });
  }
}
