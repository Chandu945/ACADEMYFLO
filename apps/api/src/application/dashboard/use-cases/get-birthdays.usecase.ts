import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository, BirthdayStudent } from '@domain/student/ports/student.repository';
import { FeeErrors } from '../../common/errors';
import type { UserRole } from '@playconnect/contracts';

export interface GetBirthdaysInput {
  actorUserId: string;
  actorRole: UserRole;
  scope: 'today' | 'month';
}

export interface BirthdayDto {
  id: string;
  fullName: string;
  profilePhotoUrl: string | null;
  dateOfBirth: string;
  guardianMobile: string;
}

export interface BirthdaysResultDto {
  scope: 'today' | 'month';
  students: BirthdayDto[];
}

export class GetBirthdaysUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly studentRepo: StudentRepository,
  ) {}

  async execute(input: GetBirthdaysInput): Promise<Result<BirthdaysResultDto, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(FeeErrors.dashboardNotAllowed());
    }

    const user = await this.userRepo.findById(input.actorUserId);
    if (!user || !user.academyId) return err(FeeErrors.academyRequired());

    const academyId = user.academyId;

    // Use IST (UTC+5:30) for "today"
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const month = istNow.getUTCMonth() + 1;
    const day = istNow.getUTCDate();

    let results: BirthdayStudent[];
    if (input.scope === 'today') {
      results = await this.studentRepo.findBirthdaysByAcademy(academyId, month, day);
    } else {
      results = await this.studentRepo.findBirthdaysByAcademy(academyId, month);
    }

    const students: BirthdayDto[] = results.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      profilePhotoUrl: s.profilePhotoUrl,
      dateOfBirth: s.dateOfBirth.toISOString().slice(0, 10),
      guardianMobile: s.guardianMobile,
    }));

    return ok({ scope: input.scope, students });
  }
}
