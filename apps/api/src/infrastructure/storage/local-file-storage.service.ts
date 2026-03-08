import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileStoragePort } from '@application/common/ports/file-storage.port';

@Injectable()
export class LocalFileStorageService implements FileStoragePort {
  private readonly baseDir = path.resolve(process.cwd(), 'uploads');

  async upload(
    folder: string,
    filename: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<string> {
    const dir = path.join(this.baseDir, folder);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${folder}/${filename}`;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith('/uploads/')) return;
    const filePath = path.join(process.cwd(), fileUrl);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted — ignore
    }
  }
}
