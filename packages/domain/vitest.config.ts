import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: 'packages-domain',
      coverage: {
        thresholds: {
          lines: 60,
          branches: 50,
          functions: 50,
          statements: 60,
        },
      },
    },
  }),
);
