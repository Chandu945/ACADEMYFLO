import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { ListAllAuditLogsUseCase } from '@application/admin/use-cases/list-all-audit-logs.usecase';
import { mapResultToResponse } from '../common/result-mapper';
import { AdminAllAuditLogsQueryDto } from './dto/admin-all-audit-logs.query';
import type { Request } from 'express';

@ApiTags('Admin Audit')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN')
@Throttle({
  short: { limit: 40, ttl: 10_000 },
  medium: { limit: 150, ttl: 60_000 },
  long: { limit: 800, ttl: 900_000 },
})
export class AdminAuditController {
  constructor(
    @Inject('LIST_ALL_AUDIT_LOGS_USE_CASE')
    private readonly listAll: ListAllAuditLogsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'System-wide audit log feed across all academies' })
  async listAuditLogs(
    @Query() query: AdminAllAuditLogsQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listAll.execute({
      actorRole: user.role,
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
      action: query.action,
      entityType: query.entityType,
      academyId: query.academyId,
      actorUserId: query.actorUserId,
    });
    return mapResultToResponse(result, req);
  }
}
