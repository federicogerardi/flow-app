---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-18
source_count: 4
confidence: high
---

# Dependency Injection Setup

> Wiring application services, repositories, and infrastructure  
> `apps/backend/src/bootstrap.ts`

## Principle

No DI container library (awilix, tsyringe, inversify). **Manual factory functions** with constructor injection. This keeps dependencies explicit, TypeScript-native, and debuggable without magic decorators or runtime reflection.

## Approach: Manual DI

```typescript
// apps/backend/src/bootstrap.ts

// 1. Infrastructure
const db  = createKyselyDb(process.env.DATABASE_URL!);
const redis = new Redis(process.env.REDIS_URL!);

// 2. Repositories (implement domain interfaces)
const sessionRepo   = new KyselySessionRepository(db);
const workspaceRepo = new KyselyWorkspaceRepository(db);
const userRepo      = new KyselyUserRepository(db);
const quotaRepo     = new KyselyQuotaRepository(db);

// 3. Infrastructure services
const idempotency  = new RedisIdempotencyStore(redis);
const llmGateway   = new LlmGateway({
  apiKey:              process.env.OPENROUTER_API_KEY!,
  baseUrl:             process.env.OPENROUTER_BASE_URL!,
  appName:             'flow-app',
  defaultTimeoutMs:    60000,
});
const promptLoader = new PromptLoader('apps/backend/src/prompts/');
const eventBridge  = new JobEventBridge(redis);
const eventBus     = new DomainEventBus();

// 4. Domain services
const contextEnricher = new ContextEnricher();
const assetResolver   = new AssetResolver(workspaceRepo);
const quotaEnforcer   = new QuotaEnforcer();
const toolRegistry    = loadToolRegistry(); // from @flow-app/domain

// 5. Application services
const startSessionUC    = new StartSessionUseCase(
  idempotency, sessionRepo, toolRegistry, assetResolver
);
const processStepUC     = new ProcessStepUseCase(
  contextEnricher, llmGateway, promptLoader
);
const promoteToAssetUC  = new PromoteToAssetUseCase(workspaceRepo, toolRegistry);
const consumeCreditsUC  = new ConsumeCreditsUseCase(quotaRepo, quotaEnforcer);

// 6. Event handlers
eventBus.subscribe('SessionCompleted', (e) => consumeCreditsUC.execute(e));
// Promotion is explicit (POST /api/artifacts/:id/promote), not event-driven.

// 7. Worker
const worker = createSessionWorker({
  sessionRepo, processStepUC, toolRegistry, eventBridge,
  buildMachine: (deps) => sessionMachine.provide({
    actors: {
      executeStep:    fromPromise(async ({ input }) => deps.processStepUC.execute({...})),
      persistSession: fromPromise(async ({ input }) => deps.sessionRepo.save(input.session)),
    },
  }),
});

// 8. HTTP app
const app = createApp({
  startSessionUC,
  sessionRepo,
  workspaceRepo,
  eventBridge,
  eventBus,
  // ... auth, middleware
});

// 9. Start
app.listen(process.env.PORT ?? 3000);
```

## Dependency Graph

```
LlmGateway ─────────────┐
PromptLoader ───────────┤
ContextEnricher ────────┼── ProcessStepUseCase ──┐
KyselySessionRepo ──────┤                        │
                         │                        │
KyselyWorkspaceRepo ────┼── AssetResolver ───────┼── StartSessionUseCase
RedisIdempotencyStore ──┤                        │
ToolRegistry ───────────┘                        │
                                                 │
KyselyQuotaRepo ────────┬── ConsumeCreditsUseCase │
QuotaEnforcer ──────────┘                        │
                                                 │
KyselyUserRepo ──────────── AuthMiddleware       │
                                                 │
JobEventBridge ──────────── SessionWorker ───────┘
DomainEventBus ──────────── EventHandlers
```

## Per-Request vs Singleton

All dependencies are **singletons** (created once at startup). Kysely uses connection pooling internally, making repository singletons safe. XState actors are created per-session by the worker — the machine definition is a singleton, but actors are ephemeral.

| Dependency | Lifetime | Reason |
|-----------|----------|--------|
| Repositories | Singleton | Kysely pool handles concurrency |
| Domain services | Singleton | Stateless pure logic |
| Application services | Singleton | Stateless orchestration |
| LlmGateway | Singleton | Uses HTTP connection pool |
| XState machine definition | Singleton | Factory for per-session actors |
| XState actors | Per-session | Created and destroyed by worker |

## Testing

Manual DI makes testing trivial — inject mocks in constructor:

```typescript
// Test: StartSessionUseCase with mocked dependencies
const mockRepo = { findByIdempotencyKey: vi.fn(), save: vi.fn() };
const useCase = new StartSessionUseCase(
  mockIdempotency, mockRepo, mockToolRegistry, mockResolver
);
const result = await useCase.execute({...});
expect(mockRepo.save).toHaveBeenCalledOnce();
```

No DI container to configure per test. Just pass mock objects.

## Sources

- [[Application Services]] — all use case dependencies
- [[BullMQ Worker Wiring]] — worker bootstrap
- [[LLM Gateway - OpenRouter]] — gateway config
- [[Project Dependencies]] — full dependency map across workspaces