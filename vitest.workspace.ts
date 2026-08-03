import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace — test pyramid from bottom to top.
 *
 * Execution order is determined by vitest internally; projects are independent.
 * Each project resolves its own `vitest.config.ts` for per-layer overrides
 * (environment, coverage thresholds, pool strategy).
 */
export default defineWorkspace([
  'packages/domain',     // 415 unit tests — zero deps
  'packages/infra-db',  // 32 integration tests — PostgreSQL (fork pool, sequential)
  'apps/backend',        // 127 tests — use cases, middleware, API, workers
  'apps/frontend',       // 60 tests — components, auth, pages (jsdom)
]);
