import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { StudentRepository, BirthdayStudent } from '@domain/student/ports/student.repository';
import { FeeErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

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

    // Resolve "today" in IST via Intl so we don't depend on the server TZ
    // and avoid the UTC-offset-on-shifted-Date anti-pattern. Returns a
    // YYYY-MM-DD string we can split safely.
    const istToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const [, mStr, dStr] = istToday.split('-');
    const month = Number(mStr);
    const day = Number(dStr);

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
