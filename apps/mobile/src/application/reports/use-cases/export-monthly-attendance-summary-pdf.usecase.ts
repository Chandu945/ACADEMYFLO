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

export type ExportMonthlyAttendanceSummaryPdfDeps = {
  pdfDownload: PdfDownloadPort;
  getExportUrl: (month: string) => string;
};

export async function exportMonthlyAttendanceSummaryPdfUseCase(
  deps: ExportMonthlyAttendanceSummaryPdfDeps,
  monthKey: string,
): Promise<Result<PdfExportResult, AppError>> {
  return deps.pdfDownload.downloadAndStorePdf({
    endpoint: deps.getExportUrl(monthKey),
    reportType: 'attendance-summary',
    monthKey,
  });
}
