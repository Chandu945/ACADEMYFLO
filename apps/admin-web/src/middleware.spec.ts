import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { middleware } from './middleware';

function createMockUrl(pathname: string) {
  const url = new URL(pathname, 'http://localhost:3002');
  return Object.assign(url, {
    clone: () => new URL(url.href),
  });
}

function createMockRequest(pathname: string, hasCookie: boolean): NextRequest {
  return {
    nextUrl: createMockUrl(pathname),
    cookies: {
      has: (name: string) => hasCookie && name === 'pc_admin_session',
    },
  } as unknown as NextRequest;
}

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL) => ({ type: 'redirect', url })),
  },
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when no session and protected path', () => {
    const req = createMockRequest('/dashboard', false);
    middleware(req);
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
    expect(redirectUrl.pathname).toBe('/login');
  });

  it('redirects to /dashboard when session present and on /login', () => {
    const req = createMockRequest('/login', true);
    middleware(req);
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0] as URL;
    expect(redirectUrl.pathname).toBe('/dashboard');
  });

  it('calls next() when session present and protected path', () => {
    const req = createMockRequest('/dashboard', true);
    middleware(req);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('allows /login without session', () => {
    const req = createMockRequest('/login', false);
    middleware(req);
    expect(NextResponse.next).toHaveBeenCalled();
  });
});
