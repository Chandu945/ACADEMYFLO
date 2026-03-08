import { getRevenueExportUrl, getPendingDuesExportUrl } from './reports-api';

describe('reports-api', () => {
  describe('getRevenueExportUrl', () => {
    it('returns correct URL', () => {
      const url = getRevenueExportUrl('2026-03');
      expect(url).toBe('/api/v1/reports/revenue/export.pdf?month=2026-03');
    });
  });

  describe('getPendingDuesExportUrl', () => {
    it('returns correct URL', () => {
      const url = getPendingDuesExportUrl('2026-03');
      expect(url).toBe('/api/v1/reports/dues/pending/export.pdf?month=2026-03');
    });
  });
});
