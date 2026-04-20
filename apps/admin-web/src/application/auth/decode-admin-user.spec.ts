import { decodeAdminUser } from './use-admin-auth';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature-ignored-client-side`;
}

describe('decodeAdminUser', () => {
  const future = Math.floor(Date.now() / 1000) + 60 * 10; // +10 min
  const past = Math.floor(Date.now() / 1000) - 60; // -1 min

  it('decodes a well-formed unexpired token', () => {
    const token = makeJwt({ sub: 'u1', email: 'a@b.com', fullName: 'Admin A', exp: future });
    expect(decodeAdminUser(token)).toEqual({
      id: 'u1', email: 'a@b.com', fullName: 'Admin A', role: 'SUPER_ADMIN',
    });
  });

  it('returns null when exp is in the past', () => {
    const token = makeJwt({ sub: 'u1', email: 'a@b.com', exp: past });
    expect(decodeAdminUser(token)).toBeNull();
  });

  it('returns null when sub claim is missing', () => {
    const token = makeJwt({ email: 'a@b.com', exp: future });
    expect(decodeAdminUser(token)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(decodeAdminUser('not-a-jwt')).toBeNull();
    expect(decodeAdminUser('')).toBeNull();
  });

  it('accepts a token with no exp claim (server decides)', () => {
    const token = makeJwt({ sub: 'u1' });
    expect(decodeAdminUser(token)).not.toBeNull();
  });
});
