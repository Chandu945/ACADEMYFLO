module.exports = {
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
  mkdir: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(true)),
  readDir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() =>
    Promise.resolve({
      size: 1024,
      mtime: new Date(),
      isFile: () => true,
      isDirectory: () => false,
      name: 'file',
      path: '/mock/file',
      ctime: new Date(),
    }),
  ),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ statusCode: 200, bytesWritten: 1024 }),
  })),
};
