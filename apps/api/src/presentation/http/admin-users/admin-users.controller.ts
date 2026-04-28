import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { SearchAdminUsersUseCase } from '@application/admin/use-cases/search-admin-users.usecase';
import { mapResultToResponse } from '../common/result-mapper';
import { AdminUsersQueryDto } from './dto/admin-users.query';
import type { Request } from 'express';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN')
@Throttle({
  short: { limit: 40, ttl: 10_000 },
  medium: { limit: 150, ttl: 60_000 },
  long: { limit: 800, ttl: 900_000 },
})
export class AdminUsersController {
  constructor(
    @Inject('SEARCH_ADMIN_USERS_USE_CASE')
    private readonly search: SearchAdminUsersUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search users across all academies' })
  async list(
    @Query() query: AdminUsersQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.search.execute({
      actorRole: user.role,
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      role: query.role,
      academyId: query.academyId,
      status: query.status,
    });
    return mapResultToResponse(result, req);
  }
}
