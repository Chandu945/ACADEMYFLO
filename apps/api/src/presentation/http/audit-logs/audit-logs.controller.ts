import { Controller, Get, Query, Inject, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { ListAuditLogsUseCase } from '@application/audit/use-cases/list-audit-logs.usecase';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query';
import { mapResultToResponse } from '../common/result-mapper';
import type { Request } from 'express';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER')
export class AuditLogsController {
  constructor(
    @Inject('LIST_AUDIT_LOGS_USE_CASE')
    private readonly listAuditLogs: ListAuditLogsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs for academy' })
  async list(
    @Query() query: ListAuditLogsQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listAuditLogs.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
      action: query.action,
      entityType: query.entityType,
    });

    return mapResultToResponse(result, req);
  }
}
