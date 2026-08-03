import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'packages-infra-db',
      setupFiles: ['./test/setup.ts'],
      // Fork pool + sequential: prevents cross-file DB interference
      // (multiple files share the same PostgreSQL test database)
      pool: 'forks',
      fileParallelism: false,
      coverage: {
        thresholds: {
          lines: 40,
          branches: 30,
          functions: 30,
          statements: 40,
        },
      },
    },
  }),
);
