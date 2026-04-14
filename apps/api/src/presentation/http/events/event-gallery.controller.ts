import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { mapResultToResponse } from '../common/result-mapper';
import type { ListGalleryPhotosUseCase } from '@application/event/use-cases/list-gallery-photos.usecase';
import type { UploadGalleryPhotoUseCase } from '@application/event/use-cases/upload-gallery-photo.usecase';
import type { DeleteGalleryPhotoUseCase } from '@application/event/use-cases/delete-gallery-photo.usecase';
import {
  MAX_IMAGE_FILE_SIZE,
} from '@shared/utils/image-validation';
import type { Request } from 'express';

@ApiTags('Event Gallery')
@ApiBearerAuth()
@Controller('events/:eventId/gallery')
@UseGuards(JwtAuthGuard, RbacGuard)
export class EventGalleryController {
  constructor(
    @Inject('LIST_GALLERY_PHOTOS_USE_CASE')
    private readonly listPhotos: ListGalleryPhotosUseCase,
    @Inject('UPLOAD_GALLERY_PHOTO_USE_CASE')
    private readonly uploadPhoto: UploadGalleryPhotoUseCase,
    @Inject('DELETE_GALLERY_PHOTO_USE_CASE')
    private readonly deletePhoto: DeleteGalleryPhotoUseCase,
  ) {}

  @Get()
  @Roles('OWNER', 'STAFF', 'PARENT')
  @ApiOperation({ summary: 'List gallery photos for an event' })
  async list(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.listPhotos.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      eventId,
    });
    return mapResultToResponse(result, req);
  }

  @Post()
  @Roles('OWNER', 'STAFF')
  @Throttle({ short: { limit: 10, ttl: 10_000 }, medium: { limit: 30, ttl: 60_000 }, long: { limit: 100, ttl: 900_000 } })
  @ApiOperation({ summary: 'Upload a photo to event gallery' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_FILE_SIZE } }))
  async upload(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadPhoto.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      eventId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    return mapResultToResponse(result, req);
  }

  @Delete(':photoId')
  @Roles('OWNER', 'STAFF')
  @ApiOperation({ summary: 'Delete a photo from event gallery' })
  async remove(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const result = await this.deletePhoto.execute({
      actorUserId: user.userId,
      actorRole: user.role,
      eventId,
      photoId,
    });
    return mapResultToResponse(result, req);
  }
}
