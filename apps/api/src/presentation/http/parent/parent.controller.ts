import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MAX_IMAGE_FILE_SIZE } from '@shared/utils/image-validation';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { GetMyChildrenUseCase } from '@application/parent/use-cases/get-my-children.usecase';
import type { GetChildAttendanceUseCase } from '@application/parent/use-cases/get-child-attendance.usecase';
import type { GetChildFeesUseCase } from '@application/parent/use-cases/get-child-fees.usecase';
import type { InitiateFeePaymentUseCase } from '@application/parent/use-cases/initiate-fee-payment.usecase';
import type { GetFeePaymentStatusUseCase } from '@application/parent/use-cases/get-fee-payment-status.usecase';
import type { GetReceiptUseCase } from '@application/parent/use-cases/get-receipt.usecase';
import type { UpdateParentProfileUseCase } from '@application/parent/use-cases/update-parent-profile.usecase';
import type { ChangePasswordUseCase } from '@application/parent/use-cases/change-password.usecase';
import type { GetAcademyInfoUseCase } from '@application/parent/use-cases/get-academy-info.usecase';
import type { GetPaymentHistoryUseCase } from '@application/parent/use-cases/get-payment-history.usecase';
import type { GetAcademyPaymentMethodsUseCase } from '@application/parent/use-cases/get-academy-payment-methods.usecase';
import type { CreateParentPaymentRequestUseCase } from '@application/parent/use-cases/create-parent-payment-request.usecase';
import type { UploadPaymentProofUseCase } from '@application/parent/use-cases/upload-payment-proof.usecase';
import { CreateParentPaymentRequestDto } from './dto/create-parent-payment-request.dto';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { ACADEMY_REPOSITORY } from '@domain/academy/ports/academy.repository';
import type { AcademyRepository } from '@domain/academy/ports/academy.repository';
import { PUSH_NOTIFICATION_SERVICE } from '../device-tokens/device-tokens.module';
import type { PushNotificationService } from '@application/notifications/push-notification.service';
import { LOGGER_PORT } from '@shared/logging/logger.port';
import type { LoggerPort } from '@shared/logging/logger.port';
import { ok as okResult, err as errResult } from '@shared/kernel';
import { AppError as AppErrorClass } from '@shared/kernel';
import {
  ChildAttendanceQueryDto,
  ChildFeesQueryDto,
  InitiateFeePaymentDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/parent-query.dto';
import { mapResultToResponse } from '../common/result-mapper';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import type { Request } from 'express';

@ApiTags('Parent Portal')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('PARENT')
export class ParentController {
  constructor(
    @Inject('GET_MY_CHILDREN_USE_CASE')
    private readonly getMyChildren: GetMyChildrenUseCase,
    @Inject('GET_CHILD_ATTENDANCE_USE_CASE')
    private readonly getChildAttendance: GetChildAttendanceUseCase,
    @Inject('GET_CHILD_FEES_USE_CASE')
    private readonly getChildFees: GetChildFeesUseCase,
    @Inject('INITIATE_FEE_PAYMENT_USE_CASE')
    private readonly initiateFeePayment: InitiateFeePaymentUseCase,
    @Inject('GET_FEE_PAYMENT_STATUS_USE_CASE')
    private readonly getFeePaymentStatus: GetFeePaymentStatusUseCase,
    @Inject('GET_RECEIPT_USE_CASE')
    private readonly getReceipt: GetReceiptUseCase,
    @Inject('UPDATE_PARENT_PROFILE_USE_CASE')
    private readonly updateParentProfile: UpdateParentProfileUseCase,
    @Inject('CHANGE_PASSWORD_USE_CASE')
    private readonly changePasswordUC: ChangePasswordUseCase,
    @Inject('GET_ACADEMY_INFO_USE_CASE')
    private readonly getAcademyInfo: GetAcademyInfoUseCase,
    @Inject('GET_PAYMENT_HISTORY_USE_CASE')
    private readonly getPaymentHistory: GetPaymentHistoryUseCase,
    @Inject('GET_ACADEMY_PAYMENT_METHODS_USE_CASE')
    private readonly getAcademyPaymentMethods: GetAcademyPaymentMethodsUseCase,
    @Inject('CREATE_PARENT_PAYMENT_REQUEST_USE_CASE')
    private readonly createParentPaymentRequest: CreateParentPaymentRequestUseCase,
    @Inject('UPLOAD_PAYMENT_PROOF_USE_CASE')
    private readonly uploadPaymentProof: UploadPaymentProofUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(ACADEMY_REPOSITORY)
    private readonly academyRepo: AcademyRepository,
    @Inject(PUSH_NOTIFICATION_SERVICE)
    private readonly pushService: PushNotificationService,
    @Inject(LOGGER_PORT)
    private readonly logger: LoggerPort,
  ) {}

  @Get('children')
  @ApiOperation({ summary: 'Get linked children' })
  async children(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getMyChildren.execute({
      parentUserId: user.userId,
      parentRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Get('payment-methods')
  @ApiOperation({
    summary: 'Get the academy\u2019s configured manual payment methods',
  })
  async paymentMethods(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getAcademyPaymentMethods.execute({
      actorUserId: user.userId,
      actorRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Post('payment-requests')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    short: { limit: 3, ttl: 10_000 },
    medium: { limit: 10, ttl: 60_000 },
    long: { limit: 30, ttl: 900_000 },
  })
  @ApiOperation({
    summary: 'Submit a manual payment request with a proof screenshot',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async submitPaymentRequest(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateParentPaymentRequestDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Payment proof screenshot is required');
    }

    // Step 1 — upload the proof image.
    const uploadResult = await this.uploadPaymentProof.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    if (!uploadResult.ok) {
      return mapResultToResponse(uploadResult, req);
    }

    // Step 2 — create the payment request pointing at the uploaded URL.
    const result = await this.createParentPaymentRequest.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      studentId: dto.studentId,
      feeDueId: dto.feeDueId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      proofImageUrl: uploadResult.value.url,
      paymentRefNumber: dto.paymentRefNumber ?? null,
      parentNote: dto.parentNote ?? null,
    });

    // Fire-and-forget push notification to the academy owner.
    // Mirrors the pattern used by the staff payment-requests controller: one
    // swallowed push error never affects the request the parent submitted.
    if (result.ok) {
      const logger = this.logger;
      this.academyRepo
        .findById(result.value.academyId)
        .then((academy) => {
          if (!academy) return;
          return this.pushService.sendToUser(academy.ownerUserId, {
            title: 'New Payment Request',
            body: `${result.value.staffName ?? 'A parent'} submitted a payment for ${result.value.studentName ?? 'a student'} (${result.value.monthKey}). Tap to review the proof.`,
            data: {
              type: 'PAYMENT_REQUEST',
              requestId: result.value.id,
              source: 'PARENT',
            },
          });
        })
        .catch((pushErr) => {
          logger.warn('Parent payment-request push failed', {
            error: pushErr instanceof Error ? pushErr.message : String(pushErr),
          });
        });
    }

    return mapResultToResponse(result, req, HttpStatus.CREATED);
  }

  @Get('children/:studentId/attendance')
  @ApiOperation({ summary: 'Get child attendance summary for a month' })
  async childAttendance(
    @Param('studentId', ParseObjectIdPipe) studentId: string,
    @Query() query: ChildAttendanceQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getChildAttendance.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      studentId,
      month: query.month,
    });
    return mapResultToResponse(result, req);
  }

  @Get('children/:studentId/fees')
  @ApiOperation({ summary: 'Get child fee dues for a date range' })
  async childFees(
    @Param('studentId', ParseObjectIdPipe) studentId: string,
    @Query() query: ChildFeesQueryDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getChildFees.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      studentId,
      from: query.from,
      to: query.to,
    });
    return mapResultToResponse(result, req);
  }

  @Post('fee-payments/initiate')
  @Throttle({ short: { limit: 10, ttl: 10_000 }, medium: { limit: 20, ttl: 60_000 }, long: { limit: 80, ttl: 900_000 } })
  @ApiOperation({ summary: 'Initiate fee payment via Cashfree' })
  async initiate(
    @Body() dto: InitiateFeePaymentDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.initiateFeePayment.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      feeDueId: dto.feeDueId,
    });
    return mapResultToResponse(result, req, HttpStatus.CREATED);
  }

  @Get('fee-payments/:orderId/status')
  @ApiOperation({ summary: 'Get fee payment status' })
  async paymentStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getFeePaymentStatus.execute(user.userId, orderId);
    return mapResultToResponse(result, req);
  }

  @Get('receipts/:feeDueId')
  @ApiOperation({ summary: 'Get receipt for a paid fee' })
  async receipt(
    @Param('feeDueId', ParseObjectIdPipe) feeDueId: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.getReceipt.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      feeDueId,
    });
    return mapResultToResponse(result, req);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get parent profile' })
  async getProfile(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const found = await this.userRepo.findById(user.userId);
    if (!found) {
      return mapResultToResponse(errResult(AppErrorClass.notFound('User', user.userId)), req);
    }
    const data = {
      fullName: found.fullName,
      email: found.emailNormalized,
      phoneNumber: found.phoneE164,
      profilePhotoUrl: found.profilePhotoUrl,
    };
    return mapResultToResponse(okResult(data), req);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update parent profile' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.updateParentProfile.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
    });
    return mapResultToResponse(result, req);
  }

  @Put('change-password')
  @Throttle({ short: { limit: 5, ttl: 10_000 }, medium: { limit: 15, ttl: 60_000 }, long: { limit: 50, ttl: 900_000 } })
  @ApiOperation({ summary: 'Change parent password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.changePasswordUC.execute({
      parentUserId: user.userId,
      parentRole: user.role,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
    return mapResultToResponse(result, req);
  }

  @Get('academy')
  @ApiOperation({ summary: 'Get academy info' })
  async academy(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getAcademyInfo.execute({
      parentUserId: user.userId,
      parentRole: user.role,
    });
    return mapResultToResponse(result, req);
  }

  @Get('payment-history')
  @ApiOperation({ summary: 'Get payment history across all children' })
  async paymentHistory(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const result = await this.getPaymentHistory.execute({
      parentUserId: user.userId,
      parentRole: user.role,
    });
    return mapResultToResponse(result, req);
  }
}
