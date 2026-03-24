import { Controller, Get, Query, Inject, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { GetOwnerDashboardKpisUseCase } from '@application/dashboard/use-cases/get-owner-dashboard-kpis.usecase';
import type { GetMonthlyChartUseCase } from '@application/dashboard/use-cases/get-monthly-chart.usecase';
import type { GetBirthdaysUseCase } from '@application/dashboard/use-cases/get-birthdays.usecase';
import { DashboardQueryDto } from './dto/dashboard.query';
import { MonthlyChartQueryDto } from './dto/monthly-chart.query';
import { BirthdaysQueryDto } from './dto/birthdays.query';
import { mapResultToResponse } from '../common/result-mapper';
import { getDaysInMonth } from '@domain/attendance/value-objects/local-date.vo';
import { toMonthKeyFromDate } from '@shared/date-utils';
import type { Request } from 'express';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DashboardController {
  constructor(
    @Inject('GET_OWNER_DASHBOARD_KPIS_USE_CASE')
    private readonly getOwnerDashboardKpis: GetOwnerDashboardKpisUseCase,
    @Inject('GET_MONTHLY_CHART_USE_CASE')
    private readonly getMonthlyChart: GetMonthlyChartUseCase,
    @Inject('GET_BIRTHDAYS_USE_CASE')
    private readonly getBirthdays: GetBirthdaysUseCase,
  ) {}

  @Get('owner')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Get owner dashboard KPIs' })
  async getOwnerKpis(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    let from: Date;
    let to: Date;

    if (query.from && query.to) {
      const [fY, fM, fD] = query.from.split('-').map(Number);
      const [tY, tM, tD] = query.to.split('-').map(Number);
      from = new Date(fY!, fM! - 1, fD!, 0, 0, 0, 0);
      to = new Date(tY!, tM! - 1, tD!, 23, 59, 59, 999);
    } else {
      // Default: THIS_MONTH
      const now = new Date();
      const monthKey = toMonthKeyFromDate(now);
      const [year, month] = monthKey.split('-').map(Number);
      const days = getDaysInMonth(monthKey);
      from = new Date(year!, month! - 1, 1, 0, 0, 0, 0);
      to = new Date(year!, month! - 1, days, 23, 59, 59, 999);
    }

    const result = await this.getOwnerDashboardKpis.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      from,
      to,
    });

    return mapResultToResponse(result, req);
  }

  @Get('monthly-chart')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Get monthly income/expense chart data' })
  async getMonthlyChartData(
    @Query() query: MonthlyChartQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getMonthlyChart.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      year: query.year,
    });

    return mapResultToResponse(result, req);
  }

  @Get('birthdays')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Get student birthdays (today or this month)' })
  async getBirthdayStudents(
    @Query() query: BirthdaysQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getBirthdays.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      scope: query.scope,
    });

    return mapResultToResponse(result, req);
  }
}
