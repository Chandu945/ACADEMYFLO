import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Inject,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { CreatePaymentRequestUseCase } from '@application/fee/use-cases/create-payment-request.usecase';
import type { ListPaymentRequestsUseCase } from '@application/fee/use-cases/list-payment-requests.usecase';
import type { CancelPaymentRequestUseCase } from '@application/fee/use-cases/cancel-payment-request.usecase';
import type { EditPaymentRequestUseCase } from '@application/fee/use-cases/edit-payment-request.usecase';
import type { ApprovePaymentRequestUseCase } from '@application/fee/use-cases/approve-payment-request.usecase';
import type { RejectPaymentRequestUseCase } from '@application/fee/use-cases/reject-payment-request.usecase';
import type { ListTransactionLogsUseCase } from '@application/fee/use-cases/list-transaction-logs.usecase';
import {
  CreatePaymentRequestDto,
  EditPaymentRequestDto,
  RejectPaymentRequestDto,
  ListPaymentRequestsQueryDto,
  ListTransactionLogsQueryDto,
} from './dto/payment-request.dto';
import { mapResultToResponse } from '../common/result-mapper';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import type { PaymentRequestStatus } from '@playconnect/contracts';
import type { Request } from 'express';

@ApiTags('Payment Requests')
@ApiBearerAuth()
@Controller('fees/payment-requests')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PaymentRequestsController {
  constructor(
    @Inject('CREATE_PAYMENT_REQUEST_USE_CASE')
    private readonly createPaymentRequest: CreatePaymentRequestUseCase,
    @Inject('LIST_PAYMENT_REQUESTS_USE_CASE')
    private readonly listPaymentRequests: ListPaymentRequestsUseCase,
    @Inject('CANCEL_PAYMENT_REQUEST_USE_CASE')
    private readonly cancelPaymentRequest: CancelPaymentRequestUseCase,
    @Inject('EDIT_PAYMENT_REQUEST_USE_CASE')
    private readonly editPaymentRequest: EditPaymentRequestUseCase,
    @Inject('APPROVE_PAYMENT_REQUEST_USE_CASE')
    private readonly approvePaymentRequest: ApprovePaymentRequestUseCase,
    @Inject('REJECT_PAYMENT_REQUEST_USE_CASE')
    private readonly rejectPaymentRequest: RejectPaymentRequestUseCase,
    @Inject('LIST_TRANSACTION_LOGS_USE_CASE')
    private readonly listTransactionLogs: ListTransactionLogsUseCase,
    @Inject(LOGGER_PORT) private readonly logger: LoggerPort,
  ) {}

  @Post()
  @Roles('STAFF')
  @ApiOperation({ summary: 'Create a payment request (staff only)' })
  async create(
    @Body() dto: CreatePaymentRequestDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.createPaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      studentId: dto.studentId,
      monthKey: dto.monthKey,
      staffNotes: dto.staffNotes,
    });

    if (result.ok) {
      this.logger.info('Payment request created', {
        requestId: result.value.id,
        studentId: dto.studentId,
        staffUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'List payment requests' })
  async list(
    @Query() query: ListPaymentRequestsQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listPaymentRequests.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      status: query.status as PaymentRequestStatus | undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return mapResultToResponse(result, req);
  }

  @Put(':id')
  @Roles('STAFF')
  @ApiOperation({ summary: 'Edit a payment request (staff, own, pending only)' })
  async edit(
    @Param('id') id: string,
    @Body() dto: EditPaymentRequestDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.editPaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      requestId: id,
      staffNotes: dto.staffNotes,
    });

    if (result.ok) {
      this.logger.info('Payment request edited', {
        requestId: id,
        staffUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Put(':id/cancel')
  @Roles('STAFF')
  @ApiOperation({ summary: 'Cancel a payment request (staff, own only)' })
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.cancelPaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      requestId: id,
    });

    if (result.ok) {
      this.logger.info('Payment request cancelled', {
        requestId: id,
        staffUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Put(':id/approve')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Approve a payment request (owner only)' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.approvePaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      requestId: id,
    });

    if (result.ok) {
      this.logger.info('Payment request approved', {
        requestId: id,
        approvedByUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Put(':id/reject')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Reject a payment request (owner only)' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentRequestDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.rejectPaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      requestId: id,
      reason: dto.reason,
    });

    if (result.ok) {
      this.logger.info('Payment request rejected', {
        requestId: id,
        rejectedByUserId: user.userId,
      });
    }

    return mapResultToResponse(result, req);
  }

  @Get('transactions')
  @Roles('OWNER')
  @ApiOperation({ summary: 'List transaction logs (owner only)' })
  async transactions(
    @Query() query: ListTransactionLogsQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listTransactionLogs.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      page: query.page,
      pageSize: query.pageSize,
    });

    return mapResultToResponse(result, req);
  }
}
