import type { Result, AppError } from '@shared/kernel';
import { ok, err } from '@shared/kernel';
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import { canSubmitAcademyReview } from '@domain/review/rules/review.rules';
import { ReviewErrors } from '../../common/errors';
import type { UserRole } from '@academyflo/contracts';

export interface DeleteMyReviewInput {
  parentUserId: string;
  parentRole: UserRole;
}

export class DeleteMyReviewUseCase {
  constructor(
    private readonly reviewRepo: AcademyReviewRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
  ) {}

  async execute(input: DeleteMyReviewInput): Promise<Result<void, AppError>> {
    const roleCheck = canSubmitAcademyReview(input.parentRole);
    if (!roleCheck.allowed) return err(ReviewErrors.submitNotAllowed());

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return err(ReviewErrors.noLinkedAcademy());

    const academyId = links[0]!.academyId;
    await this.reviewRepo.deleteByAcademyAndParent(academyId, input.parentUserId);
    return ok(undefined);
  }
}
