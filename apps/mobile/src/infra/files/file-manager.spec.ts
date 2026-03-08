import RNFS from 'react-native-fs';
import { ensureExportsDir, moveToExports, cleanupExports, listExports, getTempPath, getFinalPath } from './file-manager';

jest.mock('react-native-fs');

const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('file-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureExportsDir', () => {
    it('creates directory if it does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockResolvedValue(undefined);

      const dir = await ensureExportsDir();

      expect(mockRNFS.mkdir).toHaveBeenCalled();
      expect(dir).toContain('PlayConnect/exports');
    });

    it('skips mkdir if directory exists', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      await ensureExportsDir();

      expect(mockRNFS.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('getTempPath / getFinalPath', () => {
    it('returns temp path in caches dir', () => {
      expect(getTempPath('test.pdf')).toContain('test.pdf.tmp');
    });

    it('returns final path in exports dir', () => {
      expect(getFinalPath('test.pdf')).toContain('PlayConnect/exports/test.pdf');
    });
  });

  describe('moveToExports', () => {
    it('moves file and returns metadata', async () => {
      mockRNFS.exists
        .mockResolvedValueOnce(true) // ensureExportsDir
        .mockResolvedValueOnce(false); // target does not exist
      mockRNFS.moveFile.mockResolvedValue(undefined);
      mockRNFS.stat.mockResolvedValue({
        size: 2048,
        mtime: new Date('2026-03-01T10:00:00Z'),
        isFile: () => true,
        isDirectory: () => false,
        name: 'test.pdf',
        path: '/mock/test.pdf',
        ctime: new Date(),
        originalFilepath: '',
      });

      const result = await moveToExports('/tmp/test.pdf.tmp', 'test.pdf');

      expect(mockRNFS.moveFile).toHaveBeenCalledWith('/tmp/test.pdf.tmp', expect.stringContaining('test.pdf'));
      expect(result.filename).toBe('test.pdf');
      expect(result.sizeBytes).toBe(2048);
    });

    it('removes existing file before moving', async () => {
      mockRNFS.exists
        .mockResolvedValueOnce(true) // ensureExportsDir
        .mockResolvedValueOnce(true); // target exists
      mockRNFS.unlink.mockResolvedValue(undefined);
      mockRNFS.moveFile.mockResolvedValue(undefined);
      mockRNFS.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
        name: 'test.pdf',
        path: '/mock/test.pdf',
        ctime: new Date(),
        originalFilepath: '',
      });

      await moveToExports('/tmp/test.pdf.tmp', 'test.pdf');

      expect(mockRNFS.unlink).toHaveBeenCalled();
    });
  });

  describe('cleanupExports', () => {
    it('returns 0 when directory does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);

      const count = await cleanupExports();

      expect(count).toBe(0);
    });

    it('removes files exceeding max count', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      // Create 22 files (max is 20)
      const files = Array.from({ length: 22 }, (_, i) => ({
        name: `file-${i}.pdf`,
        path: `/mock/exports/file-${i}.pdf`,
        size: 1024,
        mtime: new Date(Date.now() - i * 60000), // each 1 minute older
        isFile: () => true,
        isDirectory: () => false,
        ctime: new Date(),
      }));
      mockRNFS.readDir.mockResolvedValue(files);
      mockRNFS.unlink.mockResolvedValue(undefined);

      const removed = await cleanupExports();

      expect(removed).toBe(2);
      expect(mockRNFS.unlink).toHaveBeenCalledTimes(2);
    });

    it('removes files older than 14 days', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const files = [
        {
          name: 'recent.pdf',
          path: '/mock/exports/recent.pdf',
          size: 1024,
          mtime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
          ctime: new Date(),
        },
        {
          name: 'old.pdf',
          path: '/mock/exports/old.pdf',
          size: 1024,
          mtime: oldDate,
          isFile: () => true,
          isDirectory: () => false,
          ctime: new Date(),
        },
      ];
      mockRNFS.readDir.mockResolvedValue(files);
      mockRNFS.unlink.mockResolvedValue(undefined);

      const removed = await cleanupExports();

      expect(removed).toBe(1);
    });
  });

  describe('listExports', () => {
    it('returns empty when directory does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);

      const result = await listExports();

      expect(result).toEqual([]);
    });

    it('returns files sorted by mtime descending', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        {
          name: 'old.pdf',
          path: '/mock/exports/old.pdf',
          size: 100,
          mtime: new Date('2026-01-01'),
          isFile: () => true,
          isDirectory: () => false,
          ctime: new Date(),
        },
        {
          name: 'new.pdf',
          path: '/mock/exports/new.pdf',
          size: 200,
          mtime: new Date('2026-03-01'),
          isFile: () => true,
          isDirectory: () => false,
          ctime: new Date(),
        },
      ]);

      const result = await listExports();

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('new.pdf');
      expect(result[1].filename).toBe('old.pdf');
    });
  });
});
