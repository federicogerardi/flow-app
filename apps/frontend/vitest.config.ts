import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseConfig } from '../../vitest.config.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    css: true,
    test: {
      name: 'frontend',
      environment: 'jsdom',
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
