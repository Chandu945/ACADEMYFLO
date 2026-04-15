import { Injectable, Logger } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { FileStoragePort, UploadResult } from '@application/common/ports/file-storage.port';
import { AppConfigService } from '@shared/config/config.service';
import { resizeForUpload } from './image-resizer';

const THUMB_SUFFIX = '-thumb';

@Injectable()
export class R2StorageService implements FileStoragePort {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: AppConfigService) {
    this.bucket = this.config.r2BucketName;
    this.publicBaseUrl = this.config.r2PublicBaseUrl.replace(/\/+$/, '');
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.r2Endpoint,
      credentials: {
        accessKeyId: this.config.r2AccessKeyId,
        secretAccessKey: this.config.r2SecretAccessKey,
      },
    });
  }

  async upload(
    folder: string,
    filename: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<UploadResult> {
    const baseName = filename.replace(/\.[^.]+$/, '');
    const originalKey = `${folder}/${baseName}.jpg`;
    const thumbKey = `${folder}/${baseName}${THUMB_SUFFIX}.jpg`;

    const { original, thumbnail } = await resizeForUpload(buffer);

    await Promise.all([
      this.putObject(originalKey, original),
      this.putObject(thumbKey, thumbnail),
    ]);

    return {
      url: `${this.publicBaseUrl}/${originalKey}`,
      thumbnailUrl: `${this.publicBaseUrl}/${thumbKey}`,
    };
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    const key = this.extractKey(fileUrl);
    if (!key) return;
    // Best-effort delete both variants. We assume every uploaded image has a
    // matching `-thumb` sibling; the delete for a non-existent key is a no-op
    // in S3/R2 semantics (200 OK with DeleteMarker=false).
    const thumbKey = key.replace(/(\.[^./]+)?$/, (ext) => `${THUMB_SUFFIX}${ext}`);
    try {
      await Promise.all([
        this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })),
        this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: thumbKey })),
      ]);
    } catch (err) {
      this.logger.warn(`Delete failed for ${fileUrl}: ${(err as Error).message}`);
    }
  }

  private async putObject(key: string, body: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  /**
   * Extract the R2 object key from a public URL produced by this service.
   * Returns null if the URL doesn't belong to our bucket.
   */
  private extractKey(url: string): string | null {
    if (!url.startsWith(this.publicBaseUrl + '/')) return null;
    return url.slice(this.publicBaseUrl.length + 1);
  }
}
