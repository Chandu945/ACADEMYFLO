import type { Result } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AppError } from '@shared/kernel';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import type { EventRepository } from '@domain/event/ports/event.repository';
import { EventErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface GetEventSummaryInput {
  actorUserId: string;
  actorRole: UserRole;
}

export interface EventSummaryOutput {
  thisMonth: {
    total: number;
    upcoming: number;
  };
}

export class GetEventSummaryUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  async execute(input: GetEventSummaryInput): Promise<Result<EventSummaryOutput, AppError>> {
    if (input.actorRole !== 'OWNER' && input.actorRole !== 'STAFF') {
      return err(EventErrors.manageNotAllowed());
    }

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(EventErrors.academyRequired());

    // Current month boundaries (IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const year = nowIST.getUTCFullYear();
    const month = nowIST.getUTCMonth();

    const monthStart = new Date(Date.UTC(year, month, 1) - istOffset);
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - istOffset);

    const counts = await this.eventRepo.countByAcademyAndMonth(
      actor.academyId,
      monthStart,
      monthEnd,
    );

    return ok({ thisMonth: counts });
  }
}
