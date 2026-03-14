import {
  Controller,
  Get,
  Post,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '@application/common/current-user';
import type { UploadProfilePhotoUseCase } from '@application/identity/use-cases/upload-profile-photo.usecase';
import { USER_REPOSITORY } from '@domain/identity/ports/user.repository';
import type { UserRepository } from '@domain/identity/ports/user.repository';
import { mapResultToResponse } from '../common/result-mapper';
import { ok as okResult, err as errResult, AppError } from '@shared/kernel';
import { MAX_IMAGE_FILE_SIZE } from '@shared/utils/image-validation';
import type { Request } from 'express';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('OWNER', 'STAFF', 'PARENT')
export class ProfileController {
  constructor(
    @Inject('UPLOAD_PROFILE_PHOTO_USE_CASE')
    private readonly uploadProfilePhoto: UploadProfilePhotoUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: CurrentUserType, @Req() req: Request) {
    const found = await this.userRepo.findById(user.userId);
    if (!found) {
      return mapResultToResponse(errResult(AppError.notFound('User', user.userId)), req);
    }
    const data = {
      id: found.id.toString(),
      fullName: found.fullName,
      email: found.emailNormalized,
      phoneNumber: found.phoneE164,
      role: found.role,
      status: found.status,
      profilePhotoUrl: found.profilePhotoUrl,
    };
    return mapResultToResponse(okResult(data), req);
  }

  @Post('photo')
  @Throttle({ short: { limit: 15, ttl: 10_000 }, medium: { limit: 40, ttl: 60_000 }, long: { limit: 200, ttl: 900_000 } })
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    if (!file) {
      return mapResultToResponse(errResult(AppError.validation('No file provided')), req);
    }

    const result = await this.uploadProfilePhoto.execute({
      actorUserId: user.userId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    return mapResultToResponse(result, req);
  }
}
