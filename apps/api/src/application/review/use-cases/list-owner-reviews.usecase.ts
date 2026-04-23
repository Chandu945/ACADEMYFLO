import type { Result, AppError } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canViewAcademyReviews } from '@domain/review/rules/review.rules';
import { ReviewErrors } from '../../common/errors';
import type { AcademyReviewDto } from '../dtos/review.dto';
import type { UserRole } from '@academyflo/contracts';

export interface ListOwnerReviewsInput {
  actorUserId: string;
  actorRole: UserRole;
}

export class ListOwnerReviewsUseCase {
  constructor(
    private readonly reviewRepo: AcademyReviewRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: ListOwnerReviewsInput): Promise<Result<AcademyReviewDto[], AppError>> {
    const roleCheck = canViewAcademyReviews(input.actorRole);
    if (!roleCheck.allowed) return err(ReviewErrors.viewNotAllowed());

    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor || !actor.academyId) return err(ReviewErrors.ownerAcademyRequired());

    const reviews = await this.reviewRepo.listByAcademy(actor.academyId);
    if (reviews.length === 0) return ok([]);

    // Batch fetch parent names — avoids N+1 over the UserRepository.
    const parentIds = [...new Set(reviews.map((r) => r.parentUserId))];
    const parents = await this.userRepo.findByIds(parentIds);
    const nameById = new Map(parents.map((p) => [p.id.toString(), p.fullName]));

    return ok(
      reviews.map((r) => ({
        id: r.id.toString(),
        academyId: r.academyId,
        parentUserId: r.parentUserId,
        parentName: nameById.get(r.parentUserId) ?? 'Parent',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.audit.createdAt,
        updatedAt: r.audit.updatedAt,
      })),
    );
  }
}
