import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { PdfExportResult } from '../../../domain/reports/reports.types';

export type PdfDownloadPort = {
  downloadAndStorePdf(options: {
    endpoint: string;
    reportType: string;
    monthKey: string;
  }): Promise<Result<PdfExportResult, AppError>>;
};

export type ExportPendingDuesPdfDeps = {
  pdfDownload: PdfDownloadPort;
  getExportUrl: (month: string) => string;
};

export async function exportPendingDuesPdfUseCase(
  deps: ExportPendingDuesPdfDeps,
  monthKey: string,
): Promise<Result<PdfExportResult, AppError>> {
  const endpoint = deps.getExportUrl(monthKey);

  return deps.pdfDownload.downloadAndStorePdf({
    endpoint,
    reportType: 'pending_dues',
    monthKey,
  });
}
