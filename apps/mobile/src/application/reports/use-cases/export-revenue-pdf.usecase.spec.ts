import { exportRevenuePdfUseCase } from './export-revenue-pdf.usecase';
import { ok, err } from '../../../domain/common/result';

describe('exportRevenuePdfUseCase', () => {
  it('calls pdfDownload with correct endpoint and returns metadata', async () => {
    const metadata = {
      filePath: '/exports/revenue.pdf',
      filename: 'playconnect_revenue_2026-03_20260304_1200.pdf',
      sizeBytes: 2048,
      createdAt: new Date(),
    };

    const deps = {
      pdfDownload: { downloadAndStorePdf: jest.fn().mockResolvedValue(ok(metadata)) },
      getExportUrl: jest.fn((m: string) => `/api/v1/reports/revenue/export.pdf?month=${m}`),
    };

    const result = await exportRevenuePdfUseCase(deps, '2026-03');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.filename).toContain('revenue');
    }

    expect(deps.pdfDownload.downloadAndStorePdf).toHaveBeenCalledWith({
      endpoint: '/api/v1/reports/revenue/export.pdf?month=2026-03',
      reportType: 'revenue',
      monthKey: '2026-03',
    });
  });

  it('propagates download errors', async () => {
    const deps = {
      pdfDownload: {
        downloadAndStorePdf: jest.fn().mockResolvedValue(
          err({ code: 'NETWORK', message: 'Network timeout' }),
        ),
      },
      getExportUrl: jest.fn((m: string) => `/api/v1/reports/revenue/export.pdf?month=${m}`),
    };

    const result = await exportRevenuePdfUseCase(deps, '2026-03');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK');
    }
  });
});
