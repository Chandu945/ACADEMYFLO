import { Controller, Get, Put, Param, Query, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { GetDailyStaffAttendanceViewUseCase } from '@application/staff-attendance/use-cases/get-daily-staff-attendance-view.usecase';
import type { MarkStaffAttendanceUseCase } from '@application/staff-attendance/use-cases/mark-staff-attendance.usecase';
import type { GetDailyStaffAttendanceReportUseCase } from '@application/staff-attendance/use-cases/get-daily-staff-attendance-report.usecase';
import type { GetMonthlyStaffAttendanceSummaryUseCase } from '@application/staff-attendance/use-cases/get-monthly-staff-attendance-summary.usecase';
import {
  StaffAttendanceQueryDto,
  StaffAttendanceDateOnlyQueryDto,
} from './dto/staff-attendance.query';
import { MarkStaffAttendanceDto } from './dto/mark-staff-attendance.dto';
import { StaffAttendanceMonthlyQueryDto } from './dto/monthly.query';
import { mapResultToResponse } from '../common/result-mapper';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { Request } from 'express';

@ApiTags('Staff Attendance')
@ApiBearerAuth()
@Controller('staff-attendance')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER')
export class StaffAttendanceController {
  constructor(
    @Inject('GET_DAILY_STAFF_ATTENDANCE_VIEW_USE_CASE')
    private readonly getDailyView: GetDailyStaffAttendanceViewUseCase,
    @Inject('MARK_STAFF_ATTENDANCE_USE_CASE')
    private readonly markAttendance: MarkStaffAttendanceUseCase,
    @Inject('GET_DAILY_STAFF_ATTENDANCE_REPORT_USE_CASE')
    private readonly getDailyReport: GetDailyStaffAttendanceReportUseCase,
    @Inject('GET_MONTHLY_STAFF_ATTENDANCE_SUMMARY_USE_CASE')
    private readonly getMonthlySummary: GetMonthlyStaffAttendanceSummaryUseCase,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get daily staff attendance view' })
  async dailyView(
    @Query() query: StaffAttendanceQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getDailyView.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      date: query.date,
      page: query.page,
      pageSize: query.pageSize,
    });

    return mapResultToResponse(result, req);
  }

  @Put(':staffUserId')
  @ApiOperation({ summary: 'Mark staff attendance for a date' })
  async markOne(
    @Param('staffUserId', ParseObjectIdPipe) staffUserId: string,
    @Query() query: StaffAttendanceDateOnlyQueryDto,
    @Body() dto: MarkStaffAttendanceDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.markAttendance.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      staffUserId,
      date: query.date,
      status: dto.status,
    });

    if (result.ok) {
      this.logger.info('Staff attendance marked', {
        staffUserId,
        date: query.date,
        status: dto.status,
        actorUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Get('reports/daily')
  @ApiOperation({ summary: 'Get daily staff attendance report' })
  async dailyReport(
    @Query() query: StaffAttendanceDateOnlyQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getDailyReport.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      date: query.date,
    });

    return mapResultToResponse(result, req);
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: 'Get monthly staff attendance summary' })
  async monthlySummary(
    @Query() query: StaffAttendanceMonthlyQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getMonthlySummary.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      month: query.month,
      page: query.page,
      pageSize: query.pageSize,
    });

    return mapResultToResponse(result, req);
  }
}
