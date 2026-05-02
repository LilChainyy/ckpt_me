import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web'),
      '@ckpt/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['node_modules', '.next', '.turbo', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['packages/shared/src/**', 'apps/web/app/api/**'],
      exclude: ['**/*.test.ts', '**/mock-data.ts'],
    },
  },
});
