import { canViewAuditLogs, sanitizeContext } from './audit.rules';

describe('canViewAuditLogs', () => {
  it('should allow OWNER', () => {
    expect(canViewAuditLogs('OWNER')).toBe(true);
  });

  it('should reject STAFF', () => {
    expect(canViewAuditLogs('STAFF')).toBe(false);
  });

  it('should reject SUPER_ADMIN', () => {
    expect(canViewAuditLogs('SUPER_ADMIN')).toBe(false);
  });
});

describe('sanitizeContext', () => {
  it('should return null for null/undefined input', () => {
    expect(sanitizeContext(null)).toBeNull();
    expect(sanitizeContext(undefined)).toBeNull();
  });

  it('should return null for empty object', () => {
    expect(sanitizeContext({})).toBeNull();
  });

  it('should pass through simple key-value pairs', () => {
    const result = sanitizeContext({ studentId: 'abc-123', status: 'ACTIVE' });
    expect(result).toEqual({ studentId: 'abc-123', status: 'ACTIVE' });
  });

  it('should truncate values longer than 120 characters', () => {
    const longValue = 'a'.repeat(200);
    const result = sanitizeContext({ key: longValue });
    expect(result!['key']).toHaveLength(120);
  });

  it('should limit to max 10 keys', () => {
    const ctx: Record<string, string> = {};
    for (let i = 0; i < 15; i++) {
      ctx[`key${i}`] = `value${i}`;
    }
    const result = sanitizeContext(ctx);
    expect(Object.keys(result!)).toHaveLength(10);
  });

  it('should redact email addresses', () => {
    const result = sanitizeContext({ contact: 'Email is user@example.com here' });
    expect(result!['contact']).toContain('[REDACTED_EMAIL]');
    expect(result!['contact']).not.toContain('user@example.com');
  });

  it('should redact phone numbers', () => {
    const result = sanitizeContext({ phone: 'Call +919876543210 now' });
    expect(result!['phone']).toContain('[REDACTED_PHONE]');
    expect(result!['phone']).not.toContain('+919876543210');
  });
});
