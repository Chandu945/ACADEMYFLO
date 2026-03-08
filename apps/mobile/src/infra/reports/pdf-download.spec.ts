import RNFS from 'react-native-fs';
import { downloadAndStorePdf } from './pdf-download';
import * as fileManager from '../files/file-manager';

jest.mock('react-native-fs');
jest.mock('../http/api-client', () => ({
  getAccessToken: jest.fn(() => 'test-token'),
}));
jest.mock('../env', () => ({
  env: { API_BASE_URL: 'http://localhost:3001' },
}));
jest.mock('../files/file-manager', () => ({
  getTempPath: jest.fn((f: string) => `/tmp/${f}.tmp`),
  moveToExports: jest.fn(),
  cleanupExports: jest.fn(() => Promise.resolve(0)),
  ensureExportsDir: jest.fn(() => Promise.resolve('/mock/exports')),
  getFinalPath: jest.fn((f: string) => `/mock/exports/${f}`),
}));

const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;
const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

const defaultOptions = {
  endpoint: '/api/v1/reports/revenue/export.pdf?month=2026-03',
  reportType: 'revenue',
  monthKey: '2026-03',
};

describe('downloadAndStorePdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRNFS.exists.mockResolvedValue(false);
    mockRNFS.unlink.mockResolvedValue(undefined);
  });

  it('downloads, validates, and stores PDF on success', async () => {
    mockRNFS.downloadFile.mockReturnValue({
      jobId: 1,
      promise: Promise.resolve({ statusCode: 200, bytesWritten: 2048 }),
    });
    mockFileManager.moveToExports.mockResolvedValue({
      filePath: '/mock/exports/revenue.pdf',
      filename: 'revenue.pdf',
      sizeBytes: 2048,
      createdAt: new Date(),
    });

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sizeBytes).toBe(2048);
    }
    expect(mockFileManager.cleanupExports).toHaveBeenCalled();
  });

  it('rejects invalid month key', async () => {
    const result = await downloadAndStorePdf({
      ...defaultOptions,
      monthKey: 'invalid',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('returns error on HTTP 403', async () => {
    mockRNFS.downloadFile.mockReturnValue({
      jobId: 1,
      promise: Promise.resolve({ statusCode: 403, bytesWritten: 0 }),
    });

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns error on zero bytes written', async () => {
    mockRNFS.downloadFile.mockReturnValue({
      jobId: 1,
      promise: Promise.resolve({ statusCode: 200, bytesWritten: 0 }),
    });

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Unexpected file format');
    }
  });

  it('retries once on network failure', async () => {
    let callCount = 0;
    mockRNFS.downloadFile.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          jobId: callCount,
          promise: Promise.reject(new Error('Network error')),
        };
      }
      return {
        jobId: callCount,
        promise: Promise.resolve({ statusCode: 200, bytesWritten: 1024 }),
      };
    });
    mockFileManager.moveToExports.mockResolvedValue({
      filePath: '/mock/exports/revenue.pdf',
      filename: 'revenue.pdf',
      sizeBytes: 1024,
      createdAt: new Date(),
    });

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it('fails after retry on persistent network failure', async () => {
    mockRNFS.downloadFile.mockImplementation(() => ({
      jobId: 1,
      promise: Promise.reject(new Error('Network error')),
    }));

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });

  it('does not retry on non-network errors', async () => {
    mockRNFS.downloadFile.mockReturnValue({
      jobId: 1,
      promise: Promise.resolve({ statusCode: 500, bytesWritten: 0 }),
    });

    const result = await downloadAndStorePdf(defaultOptions);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN');
    }
    // Only one call (no retry for non-network errors)
    expect(mockRNFS.downloadFile).toHaveBeenCalledTimes(1);
  });
});
