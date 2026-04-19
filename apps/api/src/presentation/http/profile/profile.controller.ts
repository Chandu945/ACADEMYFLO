import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { IsOptional, IsString, IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';
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
import { PASSWORD_HASHER } from '@application/identity/ports/password-hasher.port';
import type { PasswordHasher } from '@application/identity/ports/password-hasher.port';
import { mapResultToResponse } from '../common/result-mapper';
import { ok as okResult, err as errResult, AppError } from '@shared/kernel';
import { MAX_IMAGE_FILE_SIZE } from '@shared/utils/image-validation';
import type { Request } from 'express';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}

class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  newPassword!: string;
}

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
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
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

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const found = await this.userRepo.findById(user.userId);
    if (!found) {
      return mapResultToResponse(errResult(AppError.notFound('User', user.userId)), req);
    }

    let updated = found;

    if (dto.fullName || dto.phoneNumber) {
      updated = updated.updateProfile(dto.fullName, dto.phoneNumber);
    }

    if (dto.email) {
      const normalized = dto.email.trim().toLowerCase();
      if (normalized !== found.emailNormalized) {
        const existing = await this.userRepo.findByEmail(normalized);
        if (existing && existing.id.toString() !== found.id.toString()) {
          return mapResultToResponse(errResult(AppError.conflict('This email is already in use')), req);
        }
        updated = updated.updateEmail(normalized);
      }
    }

    if (dto.profilePhotoUrl !== undefined) {
      updated = updated.updateProfilePhoto(dto.profilePhotoUrl);
    }

    await this.userRepo.save(updated);

    return mapResultToResponse(okResult({
      id: updated.id.toString(),
      fullName: updated.fullName,
      email: updated.emailNormalized,
      phoneNumber: updated.phoneE164,
      role: updated.role,
      status: updated.status,
      profilePhotoUrl: updated.profilePhotoUrl,
    }), req);
  }

  @Put('password')
  @Throttle({ short: { limit: 5, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 }, long: { limit: 30, ttl: 900_000 } })
  @ApiOperation({ summary: 'Change password for current user' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const found = await this.userRepo.findById(user.userId);
    if (!found) {
      return mapResultToResponse(errResult(AppError.notFound('User', user.userId)), req);
    }

    const matches = await this.passwordHasher.compare(dto.currentPassword, found.passwordHash);
    if (!matches) {
      return mapResultToResponse(errResult(AppError.validation('Current password is incorrect')), req);
    }

    const newHash = await this.passwordHasher.hash(dto.newPassword);
    const updated = found.changePassword(newHash);
    await this.userRepo.save(updated);

    return mapResultToResponse(okResult({ message: 'Password changed successfully' }), req);
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
