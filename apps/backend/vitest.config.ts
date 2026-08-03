import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'backend',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        thresholds: {
          lines: 30,
          branches: 20,
          functions: 20,
          statements: 30,
        },
      },
    },
  }),
);
