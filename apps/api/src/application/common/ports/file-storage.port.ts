export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

export interface UploadResult {
  /** Full public URL for the original (already downscaled to the cap width). */
  url: string;
  /** Full public URL for the thumbnail variant, if one was produced. */
  thumbnailUrl: string | null;
}

export interface FileStoragePort {
  upload(folder: string, filename: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;
  delete(fileUrl: string): Promise<void>;
}
