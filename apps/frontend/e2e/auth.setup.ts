import { test, expect } from '@playwright/test';

/**
 * Auth setup — runs once before all E2E tests.
 *
 * Supports two modes:
 * 1. **OAuth login** (default): enters email/password via login form
 * 2. **Token injection**: set `E2E_AUTH_TOKEN` env var to skip login UI
 *
 * The saved storage state is reused by all dependent projects.
 */
const AUTH_FILE = 'e2e/.auth/user.json';

test.describe('Authentication', () => {
  test('authenticate and save state', async ({ page }) => {
    const token = process.env.E2E_AUTH_TOKEN;

    if (token) {
      // Token injection path — skip login UI
      await page.goto('/');
      await page.evaluate((t) => {
        localStorage.setItem('accessToken', t);
      }, token);
      await page.context().storageState({ path: AUTH_FILE });
      return;
    }

    const email = process.env.E2E_TEST_EMAIL ?? 'test@example.com';
    const password = process.env.E2E_TEST_PASSWORD ?? 'test-password';

    // OAuth login path
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /login|accedi/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login|accedi/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/workspaces\/|dashboard/i, { timeout: 30_000 });
    await expect(page.getByText(/tool|strumento/i).first()).toBeVisible({ timeout: 15_000 });

    await page.context().storageState({ path: AUTH_FILE });
  });
});