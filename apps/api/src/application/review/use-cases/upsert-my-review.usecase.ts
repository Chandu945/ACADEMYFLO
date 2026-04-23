import type { Result, AppError } from '@shared/kernel';
import { ok, err, AppError as AppErrorClass } from '@shared/kernel';
import { AcademyReview } from '@domain/review/entities/academy-review.entity';
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import {
  canSubmitAcademyReview,
  validateRating,
  validateReviewComment,
} from '@domain/review/rules/review.rules';
import { ReviewErrors } from '../../common/errors';
import type { AcademyReviewDto } from '../dtos/review.dto';
import type { UserRole } from '@academyflo/contracts';
import { randomUUID } from 'crypto';

export interface UpsertMyReviewInput {
  parentUserId: string;
  parentRole: UserRole;
  rating: number;
  comment?: string | null;
}

export class UpsertMyReviewUseCase {
  constructor(
    private readonly reviewRepo: AcademyReviewRepository,
    private readonly linkRepo: ParentStudentLinkRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: UpsertMyReviewInput): Promise<Result<AcademyReviewDto, AppError>> {
    const roleCheck = canSubmitAcademyReview(input.parentRole);
    if (!roleCheck.allowed) return err(ReviewErrors.submitNotAllowed());

    const ratingCheck = validateRating(input.rating);
    if (!ratingCheck.valid) return err(AppErrorClass.validation(ratingCheck.reason!));

    const trimmedComment = input.comment?.trim() ?? '';
    if (trimmedComment.length > 0) {
      const commentCheck = validateReviewComment(trimmedComment);
      if (!commentCheck.valid) return err(AppErrorClass.validation(commentCheck.reason!));
    }

    const links = await this.linkRepo.findByParentUserId(input.parentUserId);
    if (links.length === 0) return err(ReviewErrors.noLinkedAcademy());

    // Reviews are scoped to the parent's primary academy — the one they see on
    // the Academy Info screen. If a parent is linked to multiple academies
    // (rare) this picks the first; treat that as out-of-scope for v1.
    const academyId = links[0]!.academyId;

    const commentForStore = trimmedComment.length > 0 ? trimmedComment : null;

    const existing = await this.reviewRepo.findByAcademyAndParent(academyId, input.parentUserId);
    let review: AcademyReview;
    if (existing) {
      existing.updateContent({ rating: input.rating, comment: commentForStore });
      review = existing;
    } else {
      review = AcademyReview.create({
        id: randomUUID(),
        academyId,
        parentUserId: input.parentUserId,
        rating: input.rating,
        comment: commentForStore,
      });
    }

    await this.reviewRepo.save(review);

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
