import { generateRequestId, sanitizeRequestId } from './request-id';

describe('request-id', () => {
  describe('generateRequestId', () => {
    it('should produce a non-empty string', () => {
      const id = generateRequestId();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should produce unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });

    it('should be UUID-like format with hyphens', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('sanitizeRequestId', () => {
    it('should return null for empty string', () => {
      expect(sanitizeRequestId('')).toBeNull();
    });

    it('should return null for null', () => {
      expect(sanitizeRequestId(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(sanitizeRequestId(undefined)).toBeNull();
    });

    it('should return null for strings exceeding max length', () => {
      expect(sanitizeRequestId('a'.repeat(129))).toBeNull();
    });

    it('should return the value for valid strings', () => {
      expect(sanitizeRequestId('abc-123')).toBe('abc-123');
    });

    it('should accept strings at max length', () => {
      const maxStr = 'a'.repeat(128);
      expect(sanitizeRequestId(maxStr)).toBe(maxStr);
    });
  });
});
