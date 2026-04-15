import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AuthModule } from '../auth/auth.module';
import { FILE_STORAGE_PORT } from '@application/common/ports/file-storage.port';
import { R2StorageService } from '@infrastructure/storage/r2-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    { provide: FILE_STORAGE_PORT, useClass: R2StorageService },
  ],
})
export class UploadsModule {}
