import { trimAndCollapse, normalizeEmail, normalizePhone } from './string-sanitizer';

describe('string-sanitizer', () => {
  describe('trimAndCollapse', () => {
    it('trims whitespace', () => {
      expect(trimAndCollapse('  hello  ')).toBe('hello');
    });

    it('collapses multiple spaces to one', () => {
      expect(trimAndCollapse('hello   world')).toBe('hello world');
    });

    it('handles mixed whitespace', () => {
      expect(trimAndCollapse('  hello   world  ')).toBe('hello world');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(trimAndCollapse('   ')).toBe('');
    });

    it('does not alter single-spaced strings', () => {
      expect(trimAndCollapse('hello world')).toBe('hello world');
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  HELLO@Example.COM  ')).toBe('hello@example.com');
    });

    it('handles already normalized email', () => {
      expect(normalizeEmail('user@test.com')).toBe('user@test.com');
    });
  });

  describe('normalizePhone', () => {
    it('trims whitespace', () => {
      expect(normalizePhone('  +919876543210  ')).toBe('+919876543210');
    });
  });
});
