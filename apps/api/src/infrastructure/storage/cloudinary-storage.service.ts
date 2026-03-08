import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';
import { AppConfigService } from '@shared/config/config.service';

@Injectable()
export class CloudinaryStorageService implements FileStoragePort {
  constructor(private readonly config: AppConfigService) {
    cloudinary.config({
      cloud_name: this.config.cloudinaryCloudName,
      api_key: this.config.cloudinaryApiKey,
      api_secret: this.config.cloudinaryApiSecret,
    });
  }

  async upload(
    folder: string,
    filename: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `playconnect/${folder}`,
          public_id: filename.replace(/\.[^.]+$/, ''),
          resource_type: 'image',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
          } else {
            resolve(result.secure_url);
          }
        },
      );
      stream.end(buffer);
    });
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
      const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
      if (match?.[1]) {
        await cloudinary.uploader.destroy(match[1], { resource_type: 'image' });
      }
    } catch {
      // File may already be deleted — ignore
    }
  }
}
