import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { Request } from 'express';
import { mapResultToResponse } from '../common/result-mapper';
import { ok as okResult } from '@shared/kernel';
import { RequestAccountDeletionUseCase } from '@application/account-deletion/use-cases/request-account-deletion.usecase';
import { CancelAccountDeletionUseCase } from '@application/account-deletion/use-cases/cancel-account-deletion.usecase';
import {
  ACCOUNT_DELETION_REQUEST_REPOSITORY,
  type AccountDeletionRequestRepository,
} from '@domain/account-deletion/ports/account-deletion-request.repository';
import { RequestAccountDeletionDto } from './dto/request-account-deletion.dto';

@ApiTags('Account Deletion')
@ApiBearerAuth()
@Controller('account/deletion')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER')
export class AccountDeletionController {
  constructor(
    private readonly requestUseCase: RequestAccountDeletionUseCase,
    private readonly cancelUseCase: CancelAccountDeletionUseCase,
    @Inject(ACCOUNT_DELETION_REQUEST_REPOSITORY)
    private readonly requests: AccountDeletionRequestRepository,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current user\'s pending deletion request, if any' })
  async status(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const pending = await this.requests.findPendingByUserId(user.userId);
    return mapResultToResponse(
      okResult(
        pending
          ? {
              id: pending.id.toString(),
              status: pending.status,
              requestedAt: pending.requestedAt.toISOString(),
              scheduledExecutionAt: pending.scheduledExecutionAt.toISOString(),
              reason: pending.reason,
              role: pending.role,
            }
          : null,
      ),
      req,
    );
  }

  @Post()
  @Throttle({ short: { limit: 3, ttl: 60_000 }, medium: { limit: 5, ttl: 600_000 }, long: { limit: 10, ttl: 86_400_000 } })
  @ApiOperation({ summary: 'Schedule account deletion (cooling-off period applies)' })
  async request(
    @Body() dto: RequestAccountDeletionDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.requestUseCase.execute({
      userId: user.userId,
      password: dto.password,
      confirmationPhrase: dto.confirmationPhrase,
      reason: dto.reason ?? null,
      requestedFromIp: (req.ip as string | undefined) ?? null,
    });
    return mapResultToResponse(result, req);
  }

  @Delete()
  @ApiOperation({ summary: 'Cancel a pending deletion request' })
  async cancel(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.cancelUseCase.execute({ userId: user.userId });
    return mapResultToResponse(result, req);
  }
}
