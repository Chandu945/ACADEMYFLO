import { sanitizeQueryValue, buildSafeParams } from './query-sanitizer';

describe('sanitizeQueryValue', () => {
  it('returns clean strings unchanged', () => {
    expect(sanitizeQueryValue('hello')).toBe('hello');
  });

  it('trims whitespace', () => {
    expect(sanitizeQueryValue('  hello  ')).toBe('hello');
  });

  it('strips leading $ (MongoDB operator prevention)', () => {
    expect(sanitizeQueryValue('$gt')).toBe('gt');
    expect(sanitizeQueryValue('$$nested')).toBe('nested');
  });

  it('strips null bytes', () => {
    expect(sanitizeQueryValue('hello\0world')).toBe('helloworld');
  });

  it('handles combined threats', () => {
    expect(sanitizeQueryValue(' $where\0 ')).toBe('where');
  });
});

describe('buildSafeParams', () => {
  it('builds params from clean values', () => {
    const params = buildSafeParams({ page: 1, pageSize: 20, search: 'test' });
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(params.get('search')).toBe('test');
  });

  it('skips undefined values', () => {
    const params = buildSafeParams({ page: 1, status: undefined });
    expect(params.has('status')).toBe(false);
  });

  it('sanitizes string values', () => {
    const params = buildSafeParams({ search: '$or' });
    expect(params.get('search')).toBe('or');
  });

  it('skips values that become empty after sanitization', () => {
    const params = buildSafeParams({ search: '  $  ' });
    expect(params.has('search')).toBe(false);
  });
});
