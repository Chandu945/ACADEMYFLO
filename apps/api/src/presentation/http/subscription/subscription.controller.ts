import {
  Controller,
  Get,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { GetMySubscriptionUseCase } from '@application/subscription/use-cases/get-my-subscription.usecase';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import { mapResultToResponse } from '../common/result-mapper';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    @Inject('GET_MY_SUBSCRIPTION_USE_CASE')
    private readonly getMySubscription: GetMySubscriptionUseCase,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription status' })
  async getMe(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getMySubscription.execute(user.userId);
    return mapResultToResponse(result, req);
  }
}
