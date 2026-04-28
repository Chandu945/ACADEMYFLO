import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { ListAllSubscriptionPaymentsUseCase } from '@application/admin/use-cases/list-all-subscription-payments.usecase';
import { mapResultToResponse } from '../common/result-mapper';
import { AdminPaymentsQueryDto } from './dto/admin-payments.query';
import type { Request } from 'express';

@ApiTags('Admin Payments')
@ApiBearerAuth()
@Controller('admin/subscription-payments')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN')
@Throttle({
  short: { limit: 40, ttl: 10_000 },
  medium: { limit: 150, ttl: 60_000 },
  long: { limit: 800, ttl: 900_000 },
})
export class AdminPaymentsController {
  constructor(
    @Inject('LIST_ALL_SUBSCRIPTION_PAYMENTS_USE_CASE')
    private readonly listAll: ListAllSubscriptionPaymentsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Cross-academy subscription payments — surface stuck PENDING, failures, and success history',
  })
  async list(
    @Query() query: AdminPaymentsQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listAll.execute({
      actorRole: user.role,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      academyId: query.academyId,
      from: query.from,
      to: query.to,
      stuckThresholdMinutes: query.stuckThresholdMinutes,
    });
    return mapResultToResponse(result, req);
  }
}
