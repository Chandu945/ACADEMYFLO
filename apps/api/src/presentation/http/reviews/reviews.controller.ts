import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { UpsertMyReviewUseCase } from '@application/review/use-cases/upsert-my-review.usecase';
import type { GetMyReviewUseCase } from '@application/review/use-cases/get-my-review.usecase';
import type { DeleteMyReviewUseCase } from '@application/review/use-cases/delete-my-review.usecase';
import type { ListOwnerReviewsUseCase } from '@application/review/use-cases/list-owner-reviews.usecase';
import type { GetOwnerReviewsSummaryUseCase } from '@application/review/use-cases/get-owner-reviews-summary.usecase';
import { UpsertReviewDto } from './dto/upsert-review.dto';
import { mapResultToResponse } from '../common/result-mapper';
import type { Request } from 'express';

@ApiTags('Academy Reviews')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RbacGuard)
export class ReviewsController {
  constructor(
    @Inject('UPSERT_MY_REVIEW_USE_CASE')
    private readonly upsertMyReview: UpsertMyReviewUseCase,
    @Inject('GET_MY_REVIEW_USE_CASE')
    private readonly getMyReview: GetMyReviewUseCase,
    @Inject('DELETE_MY_REVIEW_USE_CASE')
    private readonly deleteMyReview: DeleteMyReviewUseCase,
    @Inject('LIST_OWNER_REVIEWS_USE_CASE')
    private readonly listOwnerReviews: ListOwnerReviewsUseCase,
    @Inject('GET_OWNER_REVIEWS_SUMMARY_USE_CASE')
    private readonly getOwnerReviewsSummary: GetOwnerReviewsSummaryUseCase,
  ) {}

  // ── Parent endpoints ─────────────────────────────────────────────────────

  @Get('parent/review')
  @Roles('PARENT')
  @ApiOperation({ summary: 'Get my academy review (returns null if none)' })
  async getMine(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getMyReview.execute({
      parentUserId: user.userId,
      parentRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Post('parent/review')
  @Roles('PARENT')
  @Throttle({ short: { limit: 3, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create or update my academy review' })
  async upsert(
    @Body() dto: UpsertReviewDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.upsertMyReview.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    return mapResultToResponse(result, req);
  }

  @Delete('parent/review')
  @Roles('PARENT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete my academy review' })
  async remove(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.deleteMyReview.execute({
      parentUserId: user.userId,
      parentRole: user.role,
    });
    return mapResultToResponse(result, req, HttpStatus.NO_CONTENT);
  }

  // ── Owner endpoints ──────────────────────────────────────────────────────

  @Get('owner/reviews')
  @Roles('OWNER')
  @ApiOperation({ summary: 'List all reviews for my academy' })
  async list(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.listOwnerReviews.execute({
      actorUserId: user.userId,
      actorRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Get('owner/reviews/summary')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Get rating summary (average + distribution)' })
  async summary(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getOwnerReviewsSummary.execute({
      actorUserId: user.userId,
      actorRole: user.role,
    });
    return mapResultToResponse(result, req);
  }
}
