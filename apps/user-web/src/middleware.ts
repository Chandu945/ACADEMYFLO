import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'pc_user_session';
const LOGIN_PATH = '/login';
const DASHBOARD_PATH = '/dashboard';
const AUTH_PATHS = ['/login', '/signup', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(COOKIE_NAME);
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p);

  if (!hasSession && !isAuthPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    // Preserve original path so login page can redirect back after auth
    if (pathname !== '/') {
      loginUrl.searchParams.set('returnTo', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthPath) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
