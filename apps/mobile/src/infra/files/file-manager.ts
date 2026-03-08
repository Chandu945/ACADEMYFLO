import RNFS from 'react-native-fs';

const EXPORTS_DIR = `${RNFS.DocumentDirectoryPath}/PlayConnect/exports`;
const MAX_FILES = 20;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export type FileMetadata = {
  filePath: string;
  filename: string;
  sizeBytes: number;
  createdAt: Date;
};

/**
 * Ensure the exports directory exists.
 */
export async function ensureExportsDir(): Promise<string> {
  const exists = await RNFS.exists(EXPORTS_DIR);
  if (!exists) {
    await RNFS.mkdir(EXPORTS_DIR);
  }
  return EXPORTS_DIR;
}

/**
 * Get a temp file path for atomic downloads.
 */
export function getTempPath(filename: string): string {
  return `${RNFS.CachesDirectoryPath}/${filename}.tmp`;
}

/**
 * Get the final file path in exports directory.
 */
export function getFinalPath(filename: string): string {
  return `${EXPORTS_DIR}/${filename}`;
}

/**
 * Atomically move a temp file to the exports directory.
 * Returns metadata about the stored file.
 */
export async function moveToExports(
  tempPath: string,
  filename: string,
): Promise<FileMetadata> {
  await ensureExportsDir();
  const finalPath = getFinalPath(filename);

  // Remove existing file at target if present
  const targetExists = await RNFS.exists(finalPath);
  if (targetExists) {
    await RNFS.unlink(finalPath);
  }

  await RNFS.moveFile(tempPath, finalPath);

  const stat = await RNFS.stat(finalPath);
  return {
    filePath: finalPath,
    filename,
    sizeBytes: Number(stat.size),
    createdAt: new Date(stat.mtime),
  };
}

/**
 * Cleanup old exports by retention policy:
 * Keep at most MAX_FILES files, and remove files older than MAX_AGE_MS.
 */
export async function cleanupExports(): Promise<number> {
  const dirExists = await RNFS.exists(EXPORTS_DIR);
  if (!dirExists) return 0;

  const files = await RNFS.readDir(EXPORTS_DIR);
  if (files.length === 0) return 0;

  const now = Date.now();
  let removed = 0;

  // Sort by mtime descending (newest first)
  const sorted = files
    .filter((f) => !f.isDirectory())
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

  for (let i = 0; i < sorted.length; i++) {
    const file = sorted[i];
    const age = now - new Date(file.mtime).getTime();
    const exceedsCount = i >= MAX_FILES;
    const exceedsAge = age > MAX_AGE_MS;

    if (exceedsCount || exceedsAge) {
      await RNFS.unlink(file.path);
      removed++;
    }
  }

  return removed;
}

/**
 * List all export files with metadata.
 */
export async function listExports(): Promise<FileMetadata[]> {
  const dirExists = await RNFS.exists(EXPORTS_DIR);
  if (!dirExists) return [];

  const files = await RNFS.readDir(EXPORTS_DIR);
  return files
    .filter((f) => !f.isDirectory())
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    .map((f) => ({
      filePath: f.path,
      filename: f.name,
      sizeBytes: Number(f.size),
      createdAt: new Date(f.mtime),
    }));
}

export const fileManager = {
  ensureExportsDir,
  getTempPath,
  getFinalPath,
  moveToExports,
  cleanupExports,
  listExports,
};
