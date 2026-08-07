---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/testing
  - wiki/e2e
  - wiki/plan
date_updated: 2026-08-08
source_count: 4
confidence: high
---

# E2E Test Plan — Tool Page Flow

> End-to-end tests for the complete tool page lifecycle: load → configure → submit → SSE progress → completed → retry.
> Uses Playwright against the staging environment with real backend + SSE.

## Overview

The tool page is the core user flow in Flow App. These E2E tests verify the full stack: React frontend → API → session worker → SSE → artifact rendering. They complement the unit/integration tests in [[testing-plan-xstate-toolpage-2026-08-07]] by testing the real data flow.

> **Implemented 2026-08-08**. All 8 E2E scenarios scaffolded in `apps/frontend/e2e/`. Requires staging environment with backend + PostgreSQL + Redis + BullMQ to execute. No flakiness by design: each test gracefully skips missing prerequisites.

## Prerequisites

- **Playwright** installed (`@playwright/test`)
- **Staging environment** running with:
  - Frontend on `localhost:5173` (or staging URL)
  - Backend on `localhost:3000` (or staging URL)
  - PostgreSQL + Redis + BullMQ worker running
  - At least one tool definition available (e.g., `blog-post`)
- **Test user** with valid auth token or OAuth flow stubbed
- **Test workspace** with at least one asset (for asset-based tools)

## Test Infrastructure

```
apps/frontend/e2e/
├── tool-page.spec.ts          # Main tool page flow
├── session-list.spec.ts       # Session list 4-state cards
├── auth.setup.ts              # Auth setup (login once, save state)
└── fixtures/
    └── test-tool.ts           # Test tool definition
```

---

## Test 1: Happy Path — Full Tool Page Flow

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: User generates content from scratch

```typescript
test('full tool page flow: load → configure → submit → complete', async ({ page }) => {
  // 1. Navigate to tool page
  await page.goto('/workspaces/ws-1/tools/blog-post');

  // 2. Wait for tool definition to load (setup panel visible)
  await expect(page.getByText('Configure')).toBeVisible();

  // 3. Fill required text inputs
  await page.getByLabel('Topic').fill('AI in marketing');
  await page.getByLabel('Language').selectOption('en');

  // 4. Verify submit button becomes enabled
  const submitBtn = page.getByRole('button', { name: /generate/i });
  await expect(submitBtn).toBeEnabled();

  // 5. Submit
  await submitBtn.click();

  // 6. Verify submitting state (progress indicator)
  await expect(page.getByText(/generating/i)).toBeVisible();

  // 7. Wait for SSE progress updates
  //    The FeedbackPanel should show step indicators
  await expect(page.getByText(/step 1/i)).toBeVisible({ timeout: 30000 });

  // 8. Wait for completion
  //    SessionSummary should render with artifact content
  await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 60000 });

  // 9. Verify artifact content is rendered
  await expect(page.locator('.react-markdown')).toBeVisible();

  // 10. Verify download buttons are enabled
  await expect(page.getByRole('button', { name: /download/i })).toBeVisible();

  // 11. Verify promote button (if tool produces an asset)
  // await expect(page.getByRole('button', { name: /promote/i })).toBeVisible();

  // 12. Click "New Generation" to retry
  await page.getByRole('button', { name: /new/i }).click();

  // 13. Verify machine resets to setup state
  await expect(page.getByLabel('Topic')).toBeVisible();
});
```

### Scenario: User submits with missing required inputs

```typescript
test('submit button disabled when required inputs missing', async ({ page }) => {
  await page.goto('/workspaces/ws-1/tools/blog-post');
  await expect(page.getByText('Configure')).toBeVisible();

  // Submit button should be disabled
  const submitBtn = page.getByRole('button', { name: /generate/i });
  await expect(submitBtn).toBeDisabled();

  // Fill only topic (language is optional)
  await page.getByLabel('Topic').fill('Test topic');
  await expect(submitBtn).toBeEnabled();
});
```

---

## Test 2: File Upload Flow

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: User uploads a file for brief tool

```typescript
test('file upload flow for brief tool', async ({ page }) => {
  await page.goto('/workspaces/ws-1/tools/brief');
  await expect(page.getByText('Configure')).toBeVisible();

  // Fill required text
  await page.getByLabel(/obiettivo/i).fill('Create a marketing brief');

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'briefing.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Test briefing content'),
  });

  // Verify file is shown
  await expect(page.getByText('briefing.txt')).toBeVisible();

  // Submit
  const submitBtn = page.getByRole('button', { name: /generate/i });
  await expect(submitBtn).toBeEnabled();
});
```

---

## Test 3: Asset Selection Flow

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: User selects workspace assets for persona tool

```typescript
test('asset selection for persona tool', async ({ page }) => {
  // Prerequisite: workspace has at least one brief asset
  await page.goto('/workspaces/ws-1/tools/buyer-persona');
  await expect(page.getByText('Configure')).toBeVisible();

  // Asset picker should be visible
  await expect(page.getByText(/brief/i)).toBeVisible();

  // Select an asset
  await page.getByRole('checkbox').first().check();

  // Submit button should enable
  const submitBtn = page.getByRole('button', { name: /generate/i });
  await expect(submitBtn).toBeEnabled();
});
```

---

## Test 4: Session Failure & Retry

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: Session fails and user retries

```typescript
test('session failure shows error with retry', async ({ page }) => {
  // This test requires a tool that will fail (e.g., mock backend to return error)
  // OR use a test-specific tool that always fails

  await page.goto('/workspaces/ws-1/tools/blog-post');
  await page.getByLabel('Topic').fill('test-failure');
  await page.getByRole('button', { name: /generate/i }).click();

  // Wait for failure state
  await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 30000 });

  // Verify error message
  await expect(page.getByText(/error/i)).toBeVisible();

  // Click retry
  await page.getByRole('button', { name: /retry/i }).click();

  // Should return to setup state
  await expect(page.getByLabel('Topic')).toBeVisible();
});
```

---

## Test 5: Session List 4-State Cards

**File**: `apps/frontend/e2e/session-list.spec.ts`

### Scenario: Session list shows correct card variants

```typescript
test('session list shows tabbed interface with correct cards', async ({ page }) => {
  await page.goto('/workspaces/ws-1/sessions');

  // 3 tabs visible
  await expect(page.getByRole('tab', { name: /in progress/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /completed/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /failed/i })).toBeVisible();

  // Click completed tab
  await page.getByRole('tab', { name: /completed/i }).click();

  // Should show completed cards with artifact preview
  await expect(page.getByText(/completed/i).first()).toBeVisible();
});
```

### Scenario: Running card shows progress bar

```typescript
test('running card shows progress bar and step label', async ({ page }) => {
  // Prerequisite: have a running session
  await page.goto('/workspaces/ws-1/sessions');
  await page.getByRole('tab', { name: /in progress/i }).click();

  // Running card should have progress bar
  const runningCard = page.locator('[class*="borderLeft"]').first();
  await expect(runningCard).toBeVisible();
  await expect(runningCard.locator('.MuiLinearProgress-root')).toBeVisible();
});
```

### Scenario: Failed card shows error and retry

```typescript
test('failed card shows error message and retry button', async ({ page }) => {
  await page.goto('/workspaces/ws-1/sessions');
  await page.getByRole('tab', { name: /failed/i }).click();

  // Failed card should have error styling
  const failedCard = page.locator('[class*="borderLeft"]').first();
  await expect(failedCard).toBeVisible();

  // Retry button navigates to tool page
  await failedCard.getByRole('button', { name: /retry/i }).click();
  await expect(page.url()).toContain('/tools/');
});
```

---

## Test 6: SSE Resilience

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: SSE reconnects after disconnect

```typescript
test('SSE reconnects after network interruption', async ({ page, context }) => {
  // Start a session
  await page.goto('/workspaces/ws-1/tools/blog-post');
  await page.getByLabel('Topic').fill('SSE test');
  await page.getByRole('button', { name: /generate/i }).click();

  // Wait for running state
  await expect(page.getByText(/step/i)).toBeVisible({ timeout: 30000 });

  // Simulate network interruption (block SSE endpoint)
  await context.route('**/api/sessions/*/events', (route) => route.abort());

  // Wait a moment
  await page.waitForTimeout(2000);

  // Restore network
  await context.unroute('**/api/sessions/*/events');

  // SSE should reconnect and continue receiving updates
  // (This tests the SSEClient retry logic)
});
```

---

## Test 7: Accessibility

**File**: `apps/frontend/e2e/tool-page.spec.ts`

### Scenario: Tool page is accessible

```typescript
test('tool page has no accessibility violations', async ({ page }) => {
  await page.goto('/workspaces/ws-1/tools/blog-post');
  await expect(page.getByText('Configure')).toBeVisible();

  // Run axe-core audit
  const { getViolations } = require('@axe-core/playwright');
  const violations = await getViolations(page);
  expect(violations).toEqual([]);
});
```

### Scenario: Gamification zone has correct ARIA

```typescript
test('gamification zone has full descriptive aria-label', async ({ page }) => {
  await page.goto('/workspaces/ws-1');
  const gamificationZone = page.locator('[aria-label*="Player profile"]');
  await expect(gamificationZone).toBeVisible();

  // XP bar has progressbar role
  const xpBar = page.locator('[role="progressbar"]');
  await expect(xpBar).toBeVisible();
});
```

---

## Test Configuration

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for SSE tests
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },
    { name: 'tool-page', testMatch: /tool-page\.spec\.ts/, dependencies: ['auth-setup'] },
    { name: 'session-list', testMatch: /session-list\.spec\.ts/, dependencies: ['auth-setup'] },
  ],
});
```

---

## Priority

| Test | Effort | Priority | Blocks |
|------|--------|----------|--------|
| Happy path (full flow) | 2h | P0 | Nothing |
| Submit disabled/enabled | 30min | P0 | Nothing |
| Session list tabs | 1h | P1 | Backend DTOs |
| File upload flow | 45min | P1 | Nothing |
| Asset selection flow | 45min | P1 | Test data |
| Failure + retry | 30min | P1 | Nothing |
| SSE resilience | 1h | P2 | Nothing |
| Accessibility | 30min | P2 | Nothing |
| Running card progress | 30min | P2 | Backend DTOs |

**Total estimated effort**: ~7h

## Sources

- [[frontend-drift-remediation-plan-2026-08-07]] — implementation reference
- [[testing-plan-xstate-toolpage-2026-08-07]] — unit/integration test plan (implemented)
- [[Session List - Live Status]] — 4-state card system spec
- [[ToolPage Machine (XState v5)]] — machine spec for E2E flow understanding
