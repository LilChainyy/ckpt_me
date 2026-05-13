import type { NextConfig } from 'next';
import { join } from 'path';

const nextConfig: NextConfig = {
  // Output standalone build for containerized deployments
  output: 'standalone',

  // Point to the monorepo root so standalone tracing finds all deps
  outputFileTracingRoot: join(__dirname, '../../'),

  // Strict mode for catching issues early
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: ['@ckpt/shared'],

  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
