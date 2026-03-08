import type { MonthlyRevenueSummaryDto } from '../dtos/monthly-revenue.dto';
import type { StudentWiseDueItemDto } from '../dtos/student-wise-dues.dto';

export const PDF_RENDERER = Symbol('PDF_RENDERER');

export interface PdfRenderer {
  renderMonthlyRevenue(month: string, data: MonthlyRevenueSummaryDto): Promise<Buffer>;
  renderPendingDues(month: string, items: StudentWiseDueItemDto[]): Promise<Buffer>;
}
