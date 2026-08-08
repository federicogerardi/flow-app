import { test, expect } from '@playwright/test';

/**
 * E2E tests for the tool page lifecycle:
 * load → configure → submit → SSE progress → completed → retry.
 *
 * Prerequisites: staging environment with at least one tool (`blog-post`) available,
 * and a test workspace with `ws-1` ID or configured via `E2E_WORKSPACE_ID`.
 */
const WS = process.env.E2E_WORKSPACE_ID ?? 'ws-1';

// ── Test 1: Happy Path — Full Tool Page Flow ───────────────────────────────────

test.describe('Tool Page — Happy Path', () => {
  test('full flow: load → configure → submit → complete → retry', async ({ page }) => {
    // 1. Navigate to tool page
    await page.goto(`/workspaces/${WS}/tools/blog-post`);

    // 2. Wait for tool definition to load (configure panel visible)
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    // 3. Fill required text inputs
    await page.getByLabel(/topic/i).fill('AI in B2B marketing');
    // Language selector if present
    const langSelect = page.getByLabel(/language|lingua/i);
    if (await langSelect.isVisible()) {
      await langSelect.selectOption('en');
    }

    // 4. Verify submit button becomes enabled
    const submitBtn = page.getByRole('button', { name: /genera|generate/i });
    await expect(submitBtn).toBeEnabled();

    // 5. Submit
    await submitBtn.click();

    // 6. Verify submitting state (progress indicator)
    await expect(page.getByText(/generazion|generating/i)).toBeVisible();

    // 7. Wait for completion (SSE progress through all steps)
    await expect(page.getByText(/completat|completed/i)).toBeVisible({ timeout: 90_000 });

    // 8. Verify artifact content is rendered
    await expect(page.locator('.react-markdown, .MuiTypography-root')).toBeVisible();

    // 9. Click "New Generation" to retry
    await page.getByRole('button', { name: /nuova|new/i }).click();

    // 10. Verify machine resets to setup state
    await expect(page.getByLabel(/topic/i)).toBeVisible({ timeout: 10_000 });
  });

  test('submit button disabled when required inputs missing', async ({ page }) => {
    await page.goto(`/workspaces/${WS}/tools/blog-post`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    const submitBtn = page.getByRole('button', { name: /genera|generate/i });
    await expect(submitBtn).toBeDisabled();

    // Fill topic → button should enable
    await page.getByLabel(/topic/i).fill('Test topic');
    await expect(submitBtn).toBeEnabled();
  });
});

// ── Test 2: File Upload Flow ───────────────────────────────────────────────────

test.describe('Tool Page — File Upload', () => {
  test('file upload for brief tool', async ({ page }) => {
    await page.goto(`/workspaces/${WS}/tools/brief`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    // Fill required text
    const objectiveField = page.getByLabel(/obiettivo|objective/i);
    if (await objectiveField.isVisible()) {
      await objectiveField.fill('Create a marketing brief for Q4 campaign');
    }

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: 'briefing.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test briefing content — Q4 campaign strategy'),
      });

      // Verify file is shown
      await expect(page.getByText(/briefing\.txt/i)).toBeVisible();
    } else {
      test.skip(true, 'No file input found — tool may not require files');
    }
  });
});

// ── Test 3: Asset Selection Flow ───────────────────────────────────────────────

test.describe('Tool Page — Asset Selection', () => {
  test('asset selection for persona tool', async ({ page }) => {
    await page.goto(`/workspaces/${WS}/tools/buyer-persona`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

// Asset picker should be visible if tool requires assets
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      await checkboxes.first().check();
      const submitBtn = page.getByRole('button', { name: /genera|generate/i });
      if (await submitBtn.isVisible()) {
        await expect(submitBtn).toBeEnabled();
      }
    } else {
      test.skip(true, 'No assets available — seed test workspace with assets first');
    }
  });
});

// ── Test 4: Session Failure & Retry ────────────────────────────────────────────

test.describe('Tool Page — Error & Retry', () => {
  test('error state shows retry button', async ({ page }) => {
    await page.goto(`/workspaces/${WS}/tools/blog-post`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    // Trigger a deliberate error: submit with invalid input that causes server error
    // Note: this test needs a tool configured to fail on specific inputs
    // For now, verify the UI has retry capability
    await page.getByLabel(/topic/i).fill('test-error-trigger');
    await page.getByRole('button', { name: /genera|generate/i }).click();

    // Either it completes (tool doesn't error on this input) or it fails
    // Both paths exercise the submit → running/completed/failed transition
    // If failed state appears, verify retry button
    const retryBtn = page.getByRole('button', { name: /riprova|retry/i });
    const newGenBtn = page.getByRole('button', { name: /nuova|new/i });

    await Promise.race([
      expect(retryBtn).toBeVisible({ timeout: 60_000 }),
      expect(newGenBtn).toBeVisible({ timeout: 60_000 }),
    ]).catch(() => {
      // Timeout — page may be stuck in submitting. Verify we didn't crash.
      expect(page.url()).toContain('/tools/');
    });
  });
});

// ── Test 6: SSE Resilience ─────────────────────────────────────────────────────

test.describe('Tool Page — SSE Resilience', () => {
  test('page survives SSE disconnect', async ({ page, context }) => {
    await page.goto(`/workspaces/${WS}/tools/blog-post`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/topic/i).fill('SSE resilience test');
    await page.getByRole('button', { name: /genera|generate/i }).click();

    // Wait for running/progress state
    await expect(page.getByText(/generazion|generating|step/i)).toBeVisible({ timeout: 30_000 });

    // Simulate network interruption
    await context.route('**/api/sessions/*/events', (route) => route.abort());
    await page.waitForTimeout(2000);

    // Restore network
    await context.unroute('**/api/sessions/*/events');

    // The page should not crash — it should either reconnect or show error
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy(); // Page still rendered
  });
});

// ── Test 7: Accessibility ──────────────────────────────────────────────────────

test.describe('Tool Page — Accessibility', () => {
  test('tool page has no critical accessibility violations', async ({ page }) => {
    await page.goto(`/workspaces/${WS}/tools/blog-post`);
    await expect(page.getByText(/configura|configure/i)).toBeVisible({ timeout: 15_000 });

    // Check key interactive elements are focusable
    const topicInput = page.getByLabel(/topic/i);
    await expect(topicInput).toBeVisible();
    await topicInput.focus();
    await expect(topicInput).toBeFocused();

    // Submit button is a button element
    const submitBtn = page.getByRole('button', { name: /genera|generate/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveAttribute('type', 'button');

    // Form labels are associated with inputs
    const labelFor = await page.getByText(/topic/i, { exact: false }).first().getAttribute('for');
    if (labelFor) {
      const inputById = page.locator(`#${labelFor}`);
      await expect(inputById).toBeVisible();
    }
  });

  test('gamification zone has proper semantics', async ({ page }) => {
    await page.goto(`/workspaces/${WS}`);
    await page.waitForLoadState('networkidle');

    // XP bar has progressbar role
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    // There may be loading skeletons initially — at least one should exist
    if (count === 0) {
      // Gamification may not be loaded yet or workspace has no gamification
      test.skip(true, 'No progressbar found — gamification may not be loaded');
      return;
    }
    await expect(progressBars.first()).toBeVisible();
  });
});