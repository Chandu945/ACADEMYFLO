export const DocumentDirectoryPath = '/documents';
export const CachesDirectoryPath = '/caches';
export const TemporaryDirectoryPath = '/tmp';
export const ExternalDirectoryPath = '/external';
export const DownloadDirectoryPath = '/downloads';

export function writeFile() { return Promise.resolve(); }
export function readFile() { return Promise.resolve(''); }
export function exists() { return Promise.resolve(false); }
export function unlink() { return Promise.resolve(); }
export function mkdir() { return Promise.resolve(); }
export function readDir() { return Promise.resolve([]); }
export function stat() { return Promise.resolve({ size: 0, isFile: () => false, isDirectory: () => false }); }

export default {
  DocumentDirectoryPath,
  CachesDirectoryPath,
  TemporaryDirectoryPath,
  ExternalDirectoryPath,
  DownloadDirectoryPath,
  writeFile,
  readFile,
  exists,
  unlink,
  mkdir,
  readDir,
  stat,
};
