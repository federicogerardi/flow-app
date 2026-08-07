import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Flow App frontend.
 *
 * Prerequisites:
 * - Frontend on `localhost:5173` (or `E2E_BASE_URL` env var)
 * - Backend on `E2E_API_URL` (default: `http://localhost:3000`)
 * - PostgreSQL + Redis + BullMQ worker running
 * - Test user with valid auth (configured via `auth.setup.ts`)
 *
 * Run: `npx playwright test`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,     // Sequential for SSE tests — avoid flaky reconnects
  retries: 1,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [['html'], ['list']],
  timeout: 120_000,         // 2 min per test (SSE generation is slow)
  expect: { timeout: 30_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Project: Auth setup (runs once, saves state)
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Project: Tool page flow
    {
      name: 'tool-page',
      testMatch: /tool-page\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
    // Project: Session list
    {
      name: 'session-list',
      testMatch: /session-list\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
});