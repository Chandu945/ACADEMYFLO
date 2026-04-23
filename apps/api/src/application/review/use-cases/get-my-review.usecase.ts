import type { Result, AppError } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { canSubmitAcademyReview } from '@domain/review/rules/review.rules';
import { ReviewErrors } from '../../common/errors';
import type { AcademyReviewDto } from '../dtos/review.dto';
import type { UserRole } from '@academyflo/contracts';

export interface GetMyReviewInput {
  parentUserId: string;
  parentRole: UserRole;
}

export class GetMyReviewUseCase {
  constructor(
    private readonly reviewRepo: AcademyReviewRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: GetMyReviewInput): Promise<Result<AcademyReviewDto | null, AppError>> {
    const roleCheck = canSubmitAcademyReview(input.parentRole);
    if (!roleCheck.allowed) return err(ReviewErrors.submitNotAllowed());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return ok(null);

    const academyId = links[0]!.academyId;
    const review = await this.reviewRepo.findByAcademyAndParent(academyId, input.parentUserId);
    if (!review) return ok(null);

    const parent = await this.userRepo.findById(input.parentUserId);

    return ok({
      id: review.id.toString(),
      academyId: review.academyId,
      parentUserId: review.parentUserId,
      parentName: parent?.fullName ?? 'Parent',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.audit.createdAt,
      updatedAt: review.audit.updatedAt,
    });
  }
}
