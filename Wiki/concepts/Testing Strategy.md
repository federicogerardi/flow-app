---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/governance
date_updated: 2026-07-30
source_count: 3
confidence: high
---

# Testing Strategy & Dependencies

> Unified test framework, zero dispersion, Context7-verified packages only

## Principle

**One runner, one pattern, no exceptions.** Vitest v4 for everything — backend unit tests, backend integration tests, frontend component tests. No Jest, no Mocha, no `node:test`. Every test file follows the same conventions regardless of workspace.

---

## Dependencies

### Shared (root devDependencies)

```json
{
  "devDependencies": {
    "vitest": "^4.1.0",
    "@vitest/coverage-v8": "^4.1.0",
    "eslint-plugin-vitest": "^0.5.0"
  }
}
```

### Backend (`apps/backend`)

```json
{
  "devDependencies": {
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0"
  }
}
```

| Package | Context7 Library ID | Purpose |
|---------|-------------------|---------|
| `vitest` | `/vitest-dev/vitest` | Test runner, assertions, mocking |
| `@vitest/coverage-v8` | `/vitest-dev/vitest` | V8 native coverage (fast, no instrumentation) |
| `eslint-plugin-vitest` | `/vitest-dev/eslint-plugin-vitest` | Linting rules for test files |
| `supertest` | `/forwardemail/supertest` | HTTP integration tests (Express routes) |

### Frontend (`apps/frontend`)

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.0",
    "@testing-library/jest-dom": "^6.6.0",
    "msw": "^2.7.0"
  }
}
```

| Package | Context7 Library ID | Purpose |
|---------|-------------------|---------|
| `vitest` | `/vitest-dev/vitest` | Test runner (shared via root) |
| `@testing-library/react` | `/testing-library/react-testing-library` | React component rendering and queries |
| `@testing-library/user-event` | `/testing-library/user-event` | Simulate real user interactions |
| `@testing-library/jest-dom` | — (extends vitest expect) | DOM-specific assertions (`toBeInTheDocument`) |
| `msw` | `/mswjs/msw` | API mocking at network level (browser + Node) |

### What we DON'T add

| ❌ Not added | Why |
|-------------|-----|
| `jest` | Redundant — Vitest is Jest-compatible, faster, Vite-native |
| `mocha` | Redundant |
| `node:test` | Inconsistency — two runners, two pattern sets |
| `cypress` / `playwright` | P2 — E2E testing is future scope |
| `sinon` | Redundant — `vi.spyOn` / `vi.fn` covers all mocking |
| `chai` / `expect` | Built into Vitest |
| `ts-mockito` / `ts-mock-imports` | Manual DI makes mocking trivial — no framework needed |

---

## Monorepo Test Configuration

### Root `vitest.workspace.ts`

```typescript
// vitest.workspace.ts (root)

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/domain',
  'packages/contracts',
  'packages/copy',
  'packages/infra-db',
  'apps/backend',
  'apps/frontend',
]);
```

### Shared base config

```typescript
// vitest.config.base.ts (root — imported by all workspaces)

import { defineConfig } from 'vitest/config';

export const baseConfig = defineConfig({
  test: {
    globals: true,                          // no need to import describe/it/expect
    environment: 'node',                    // default; frontend overrides to 'jsdom'
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/index.ts',                  // barrel exports
        'src/**/__mocks__/**',
      ],
    },
  },
});
```

### Backend config

```typescript
// apps/backend/vitest.config.ts

import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default mergeConfig(baseConfig, defineConfig({
  test: {
    name: 'backend',
    // No jsdom — backend runs in Node.js
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      thresholds: {
        'src/application/**':    { lines: 80, branches: 70 },
        'src/generation/**':     { lines: 80, branches: 70 },
        'src/infrastructure/**': { lines: 60, branches: 50 },
      },
    },
  },
}));
```

### Frontend config

```typescript
// apps/frontend/vitest.config.ts

import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseConfig } from '../../vitest.config.base';

export default mergeConfig(baseConfig, defineConfig({
  plugins: [react()],
  test: {
    name: 'frontend',
    environment: 'jsdom',                 // Required for DOM testing
    setupFiles: ['./src/test/setup.ts'],
    css: true,                            // Process CSS imports
    coverage: {
      thresholds: {
        lines: 70,
        branches: 60,
        'src/machines/**':         { lines: 90, branches: 85 },
        'src/components/**':       { lines: 70, branches: 60 },
        'src/api/**':              { lines: 60, branches: 50 },
      },
    },
  },
}));
```

### Frontend Test Setup

```typescript
// apps/frontend/src/test/setup.ts

import '@testing-library/jest-dom/vitest';   // DOM matchers: toBeInTheDocument, etc.
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup(); // unmount React components after each test
});
```

### ESLint Test Rules

```javascript
// eslint.config.js — test-specific overrides

{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  plugins: { vitest: eslintPluginVitest },
  rules: {
    ...eslintPluginVitest.configs.recommended.rules,
    'vitest/no-disabled-tests': 'warn',
    'vitest/no-focused-tests': 'error',      // no .only in CI
    'vitest/expect-expect': 'error',          // every test must have assertions
    'vitest/consistent-test-it': ['error', { fn: 'it' }],  // use `it`, not `test`
    'vitest/max-nested-describe': ['error', { max: 3 }],
  },
}
```

---

## Test Patterns — Per Layer

### Domain Tests (`packages/domain`)

Pure unit tests. No infrastructure, no mocks needed. Test invariants and state transitions.

```typescript
// packages/domain/src/generation/__tests__/Session.test.ts

import { describe, it, expect } from 'vitest';
import { Session } from '../entities/Session';
import { SessionId } from '../value-objects/SessionId';

describe('Session', () => {
  it('should start in draft status', () => {
    const session = Session.create(
      ToolKey.from('blog-post'),
      WorkspaceId.generate(),
      UserId.generate(),
      IdempotencyKey.from('hash'),
    );

    expect(session.status).toBe(SessionStatus.Draft);
  });

  it('should throw when adding duplicate final artifact', () => {
    const session = createReadySession();
    session.start();
    session.addArtifact(createFinalArtifact());

    expect(() => session.addArtifact(createFinalArtifact()))
      .toThrow('already exists');
  });

  it('should emit SessionCompleted when complete', () => {
    const session = createRunningSession();
    session.addArtifact(createFinalArtifact());

    const event = session.complete();

    expect(event.eventType).toBe('SessionCompleted');
    expect(session.status).toBe(SessionStatus.Completed);
  });
});
```

### Repository Tests (`packages/infra-db`)

Integration tests with a real PostgreSQL test database.

```typescript
// packages/infra-db/src/__tests__/SessionRepository.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KyselySessionRepository } from '../repositories/session-repository';
import { createTestDb, destroyTestDb } from '../../test/helpers';

describe('KyselySessionRepository', () => {
  let db: Kysely<DB>;
  let repo: KyselySessionRepository;

  beforeAll(async () => {
    db = await createTestDb();       // dockerized PG or pg-mem
    repo = new KyselySessionRepository(db);
  });

  afterAll(async () => {
    await destroyTestDb(db);
  });

  it('should save and retrieve a session', async () => {
    const session = Session.create(/* ... */);
    await repo.save(session);

    const found = await repo.findById(session.sessionId);
    expect(found).not.toBeNull();
    expect(found!.toolKey).toEqual(session.toolKey);
  });

  it('should find by idempotency key', async () => {
    const session = Session.create(/* ... */);
    await repo.save(session);

    const found = await repo.findByIdempotencyKey(session.idempotencyKey);
    expect(found!.sessionId).toEqual(session.sessionId);
  });
});
```

### Application Service Tests (`apps/backend`)

Unit tests with mocked repositories. Manual DI makes this trivial.

```typescript
// apps/backend/src/application/__tests__/StartSession.test.ts

import { describe, it, expect, vi } from 'vitest';
import { StartSessionUseCase } from '../generation/start-session.usecase';

describe('StartSessionUseCase', () => {
  it('should return existing session on idempotency match', async () => {
    const existingSession = Session.create(/* ... */);

    const mockIdempotency = {
      claim: vi.fn().mockResolvedValue({ claimed: false, existingSessionId: existingSession.sessionId }),
    };
    const mockSessionRepo = {
      findById: vi.fn().mockResolvedValue(existingSession),
      save: vi.fn(),
    };
    const mockToolRegistry = {
      get: vi.fn().mockReturnValue(mockTool),
    };

    const useCase = new StartSessionUseCase(
      mockIdempotency as any,
      mockSessionRepo as any,
      mockToolRegistry as any,
      mockAssetResolver as any,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      workspaceId: 'ws-1',
      toolKey: 'blog-post',
      inputs: {},
    });

    expect(result.session.sessionId).toEqual(existingSession.sessionId);
    expect(mockSessionRepo.save).not.toHaveBeenCalled(); // no duplicate create
  });
});
```

### API Integration Tests (`apps/backend`)

Full HTTP stack test with Supertest. Database is a test instance.

```typescript
// apps/backend/src/__tests__/generation.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test/app';

describe('POST /api/tools/:toolKey/sessions', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();    // boots Express with test DB + real DI
  });

  it('should return 201 on valid request', async () => {
    const res = await request(app)
      .post('/api/tools/blog-post/sessions')
      .set('Authorization', 'Bearer test-token')
      .send({
        workspaceId: 'test-ws-id',
        inputs: { text: { topic: 'B2B SaaS' } },
      });

    expect(res.status).toBe(201);
    expect(res.body.session.toolKey).toBe('blog-post');
  });

  it('should return 422 on missing required input', async () => {
    const res = await request(app)
      .post('/api/tools/blog-post/sessions')
      .set('Authorization', 'Bearer test-token')
      .send({
        workspaceId: 'test-ws-id',
        inputs: {},
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('READINESS_FAILED');
  });
});
```

### Frontend Component Tests

```tsx
// apps/frontend/src/components/__tests__/SetupPanel.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupPanel } from '../SetupPanel';

describe('SetupPanel', () => {
  it('should call onChange when text input changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <SetupPanel
        tool={mockBlogPostTool}
        inputs={{ text: {}, files: {}, selectedAssetIds: [] }}
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText('Topic');
    await user.type(input, 'B2B SaaS');

    expect(onChange).toHaveBeenCalledWith({
      text: { topic: 'B2B SaaS' },
    });
  });

  it('should disable submit when required inputs missing', () => {
    render(
      <SetupPanel
        tool={mockBlogPostTool}
        inputs={{ text: {}, files: {}, selectedAssetIds: [] }}
        onChange={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /genera/i });
    expect(button).toBeDisabled();
  });
});
```

### Frontend Machine Tests

```typescript
// apps/frontend/src/machines/__tests__/tool-page-machine.test.ts

import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { toolPageMachine } from '../tool-page-machine';

describe('toolPageMachine', () => {
  it('should transition from draftEmpty to configuring on LOAD', () => {
    const actor = createActor(toolPageMachine);
    actor.start();

    actor.send({ type: 'LOAD', tool: mockTool, workspaceId: 'ws-1' });

    expect(actor.getSnapshot().matches('configuring')).toBe(true);
  });

  it('should transition to ready when all required inputs present', () => {
    const actor = createActor(toolPageMachine);
    actor.start();
    actor.send({ type: 'LOAD', tool: mockTool, workspaceId: 'ws-1' });

    actor.send({
      type: 'CONFIGURE',
      inputs: { text: { topic: 'Hello' }, files: {}, selectedAssetIds: [] },
    });

    expect(actor.getSnapshot().matches('ready')).toBe(true);
  });

  it('should guard against submit with missing inputs', () => {
    const actor = createActor(toolPageMachine);
    actor.start();
    actor.send({ type: 'LOAD', tool: mockTool, workspaceId: 'ws-1' });

    expect(actor.getSnapshot().can({ type: 'SUBMIT' })).toBe(false);
  });
});
```

---

## Run Commands

```bash
# All workspaces
npm test

# Specific workspace
npm test -- --project=backend
npm test -- --project=frontend
npm test -- --project=packages-domain

# Watch mode (dev)
npm test -- --watch

# Coverage
npm test -- --coverage

# CI (single run, no watch, coverage)
npm test -- --run --coverage

# Single file
npm test -- packages/domain/src/generation/__tests__/Session.test.ts

# Filter by name
npm test -- -t "should emit SessionCompleted"
```

## CI Integration

```yaml
# .github/workflows/test.yml

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: flow_app_test
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test -- --run --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/flow_app_test
          REDIS_URL: redis://localhost:6379
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
```

## Governance

| Rule | Enforcement |
|------|-------------|
| **No `.only` in CI** | ESLint `vitest/no-focused-tests: error` |
| **Every test has assertions** | ESLint `vitest/expect-expect: error` |
| **Use `it`, not `test`** | ESLint `vitest/consistent-test-it` |
| **Max 3 nested describes** | ESLint `vitest/max-nested-describe` |
| **Coverage thresholds per package** | Vitest `coverage.thresholds` |
| **Test file naming**: `*.test.ts` (unit), `*.spec.ts` (integration) | Convention |
| **Test file location**: `__tests__/` folder alongside source | Convention |

## Sources

- [[sources/PRD]] — Test coverage targets (≥70% frontend, NFR-M03)
- [[packages-domain Structure]] — Domain isolation for testability
- [[Dependency Injection Setup]] — Manual DI enables trivial mocking