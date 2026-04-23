import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { AuthModule } from '../auth/auth.module';

// Schemas
import {
  AcademyReviewModel,
  AcademyReviewSchema,
} from '@infrastructure/database/schemas/academy-review.schema';
import {
  ParentStudentLinkModel,
  ParentStudentLinkSchema,
} from '@infrastructure/database/schemas/parent-student-link.schema';

// Repository implementations
import { MongoAcademyReviewRepository } from '@infrastructure/repositories/mongo-academy-review.repository';
import { MongoParentStudentLinkRepository } from '@infrastructure/repositories/mongo-parent-student-link.repository';

// Repository ports
import { ACADEMY_REVIEW_REPOSITORY } from '@domain/review/ports/academy-review.repository';
import { PARENT_STUDENT_LINK_REPOSITORY } from '@domain/parent/ports/parent-student-link.repository';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';

// Use cases
import { UpsertMyReviewUseCase } from '@application/review/use-cases/upsert-my-review.usecase';
import { GetMyReviewUseCase } from '@application/review/use-cases/get-my-review.usecase';
import { DeleteMyReviewUseCase } from '@application/review/use-cases/delete-my-review.usecase';
import { ListOwnerReviewsUseCase } from '@application/review/use-cases/list-owner-reviews.usecase';
import { GetOwnerReviewsSummaryUseCase } from '@application/review/use-cases/get-owner-reviews-summary.usecase';

// Types
import type { AcademyReviewRepository } from '@domain/review/ports/academy-review.repository';
import type { ParentStudentLinkRepository } from '@domain/parent/ports/parent-student-link.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AcademyReviewModel.name, schema: AcademyReviewSchema },
      { name: ParentStudentLinkModel.name, schema: ParentStudentLinkSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [
    { provide: ACADEMY_REVIEW_REPOSITORY, useClass: MongoAcademyReviewRepository },
    { provide: PARENT_STUDENT_LINK_REPOSITORY, useClass: MongoParentStudentLinkRepository },
    {
      provide: 'UPSERT_MY_REVIEW_USE_CASE',
      useFactory: (
        reviewRepo: AcademyReviewRepository,
        linkRepo: ParentStudentLinkRepository,
        userRepo: UserRepository,
      ) => new UpsertMyReviewUseCase(reviewRepo, linkRepo, userRepo),
      inject: [ACADEMY_REVIEW_REPOSITORY, PARENT_STUDENT_LINK_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: 'GET_MY_REVIEW_USE_CASE',
      useFactory: (
        reviewRepo: AcademyReviewRepository,
        linkRepo: ParentStudentLinkRepository,
        userRepo: UserRepository,
      ) => new GetMyReviewUseCase(reviewRepo, linkRepo, userRepo),
      inject: [ACADEMY_REVIEW_REPOSITORY, PARENT_STUDENT_LINK_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: 'DELETE_MY_REVIEW_USE_CASE',
      useFactory: (
        reviewRepo: AcademyReviewRepository,
        linkRepo: ParentStudentLinkRepository,
      ) => new DeleteMyReviewUseCase(reviewRepo, linkRepo),
      inject: [ACADEMY_REVIEW_REPOSITORY, PARENT_STUDENT_LINK_REPOSITORY],
    },
    {
      provide: 'LIST_OWNER_REVIEWS_USE_CASE',
      useFactory: (reviewRepo: AcademyReviewRepository, userRepo: UserRepository) =>
        new ListOwnerReviewsUseCase(reviewRepo, userRepo),
      inject: [ACADEMY_REVIEW_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: 'GET_OWNER_REVIEWS_SUMMARY_USE_CASE',
      useFactory: (reviewRepo: AcademyReviewRepository, userRepo: UserRepository) =>
        new GetOwnerReviewsSummaryUseCase(reviewRepo, userRepo),
      inject: [ACADEMY_REVIEW_REPOSITORY, USER_REPOSITORY],
    },
  ],
})
export class ReviewsModule {}
