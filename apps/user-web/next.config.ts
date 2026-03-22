import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// In development, Next.js React Refresh (HMR) requires 'unsafe-eval'.
// In production, we drop it for a tighter CSP.
const cspValue = isDev
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https: ws:;"
  : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Note: 'unsafe-inline' for script-src is still required by Next.js static headers.
  // For stricter CSP, migrate to nonce-based CSP via middleware in the future.
  { key: 'Content-Security-Policy', value: cspValue },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@playconnect/contracts'],
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
