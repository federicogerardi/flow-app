import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: 'packages-infra-db',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    // Fork pool + sequential: prevents cross-file DB interference
    // (multiple files share the same PostgreSQL test database)
    pool: 'forks',
    fileParallelism: false,
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
      thresholds: {
        lines: 40,
        branches: 30,
        functions: 30,
        statements: 40,
      },
    },
  },
});
