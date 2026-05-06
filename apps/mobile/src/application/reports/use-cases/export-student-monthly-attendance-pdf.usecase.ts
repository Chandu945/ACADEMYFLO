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

export type ExportStudentMonthlyAttendancePdfDeps = {
  pdfDownload: PdfDownloadPort;
  getExportUrl: (studentId: string, month: string) => string;
};

export async function exportStudentMonthlyAttendancePdfUseCase(
  deps: ExportStudentMonthlyAttendancePdfDeps,
  studentId: string,
  monthKey: string,
): Promise<Result<PdfExportResult, AppError>> {
  return deps.pdfDownload.downloadAndStorePdf({
    endpoint: deps.getExportUrl(studentId, monthKey),
    reportType: 'attendance-student',
    monthKey,
  });
}
