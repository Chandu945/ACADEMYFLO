import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { GetAdminRevenueUseCase } from '@application/admin/use-cases/get-admin-revenue.usecase';
import { mapResultToResponse } from '../common/result-mapper';
import type { Request } from 'express';

@ApiTags('Admin Revenue')
@ApiBearerAuth()
@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN')
@Throttle({
  short: { limit: 20, ttl: 10_000 },
  medium: { limit: 80, ttl: 60_000 },
  long: { limit: 400, ttl: 900_000 },
})
export class AdminRevenueController {
  constructor(
    @Inject('GET_ADMIN_REVENUE_USE_CASE')
    private readonly getRevenue: GetAdminRevenueUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'MRR / ARR / tier distribution / conversion KPIs' })
  async revenue(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getRevenue.execute({ actorRole: user.role });
    return mapResultToResponse(result, req);
  }
}
