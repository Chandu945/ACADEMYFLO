import type { Result, AppError } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAcademyReviews } from '@domain/review/rules/review.rules';
import { ReviewErrors } from '../../common/errors';
import type { AcademyReviewSummaryDto } from '../dtos/review.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetOwnerReviewsSummaryInput {
  actorUserId: string;
  actorRole: UserRole;
}

export class GetOwnerReviewsSummaryUseCase {
  constructor(
    private readonly reviewRepo: AcademyReviewRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(
    input: GetOwnerReviewsSummaryInput,
  ): Promise<Result<AcademyReviewSummaryDto, AppError>> {
    const roleCheck = canViewAcademyReviews(input.actorRole);
    if (!roleCheck.allowed) return err(ReviewErrors.viewNotAllowed());

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(ReviewErrors.ownerAcademyRequired());

    const summary = await this.reviewRepo.summaryByAcademy(actor.academyId);
    return ok(summary);
  }
}
