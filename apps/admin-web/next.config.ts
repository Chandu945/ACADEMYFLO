import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@playconnect/contracts'],
  output: 'standalone',
};

export default nextConfig;
