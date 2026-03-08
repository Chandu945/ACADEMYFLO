import { assertSafeApiUrl } from './ssrf-guard';

const BASE = 'https://api.example.com';

describe('assertSafeApiUrl', () => {
  it('accepts valid API paths', () => {
    expect(() => assertSafeApiUrl(BASE, '/api/v1/admin/academies')).not.toThrow();
    expect(() => assertSafeApiUrl(BASE, '/api/v1/admin/academies?page=1')).not.toThrow();
    expect(() =>
      assertSafeApiUrl(BASE, '/api/v1/admin/academies/abc-123/audit-logs'),
    ).not.toThrow();
  });

  it('rejects paths not starting with /', () => {
    expect(() => assertSafeApiUrl(BASE, 'api/v1')).toThrow('must start with /');
  });

  it('rejects protocol-relative paths', () => {
    expect(() => assertSafeApiUrl(BASE, '//evil.com/path')).toThrow('must not start with //');
  });

  it('rejects path traversal with /../', () => {
    expect(() => assertSafeApiUrl(BASE, '/api/../../etc/passwd')).toThrow('traversal');
  });

  it('rejects path traversal with /./', () => {
    expect(() => assertSafeApiUrl(BASE, '/api/./hidden')).toThrow('traversal');
  });

  it('rejects path ending with /..', () => {
    expect(() => assertSafeApiUrl(BASE, '/api/..')).toThrow('traversal');
  });
});
