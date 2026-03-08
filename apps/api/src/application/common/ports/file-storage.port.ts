export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT');

export interface FileStoragePort {
  upload(
    folder: string,
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string>;

  delete(fileUrl: string): Promise<void>;
}
