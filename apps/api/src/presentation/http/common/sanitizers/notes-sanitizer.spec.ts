import { sanitizeNotes } from './notes-sanitizer';

describe('sanitizeNotes', () => {
  it('strips HTML tags', () => {
    expect(sanitizeNotes('<b>bold</b>')).toBe('bold');
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeNotes('<div><p>hello</p></div>')).toBe('hello');
  });

  it('strips script tags', () => {
    expect(sanitizeNotes('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('handles unclosed tags', () => {
    expect(sanitizeNotes('hello <br')).toBe('hello');
  });

  it('trims whitespace', () => {
    expect(sanitizeNotes('  hello  ')).toBe('hello');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeNotes(long)).toHaveLength(500);
  });

  it('accepts custom max length', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeNotes(long, 100)).toHaveLength(100);
  });

  it('preserves clean text', () => {
    expect(sanitizeNotes('Payment for March 2025')).toBe('Payment for March 2025');
  });
});
