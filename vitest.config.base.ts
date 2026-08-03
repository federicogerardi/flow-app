import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all workspace projects.
 *
 * Per-workspace overrides (coverage thresholds, environment, plugins) are
 * applied in each project's own `vitest.config.ts` via mergeConfig.
 */
export const baseConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/index.ts',
        'src/**/__mocks__/**',
      ],
    },
  },
});
