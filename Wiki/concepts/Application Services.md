---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/architecture
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Application Services

> Application layer — orchestrates domain objects without containing business logic

## Principle

Application Services live in `apps/backend/src/application/`. They orchestrate the flow: load aggregates, invoke domain services, persist changes, publish events. They contain **zero business logic** — all rules live in `packages/domain`.

```
┌─────────────────────────────────────────────┐
│ Application Services (apps/backend)          │
│                                               │
│  StartSessionUseCase   ProcessStepUseCase    │
│  CompleteSession...    PromoteToAsset...     │
│  ConsumeCredits...     ResolveAssets...      │
│                                               │
│  → Orchestrate flow                          │
│  Session.apply() — single entry point for all state changes. Validates
│  against SessionLifecycle before mutating state. XState actions
│  call this; they do NOT duplicate transition logic.
│  → Manage transactions                       │
│  → Publish domain events                     │
└──────────────┬──────────────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────────────┐
│ Domain (packages/domain)                      │
│                                               │
│  Session.addArtifact()   Workspace.addAsset() │
│  ContextEnricher.enrich()                     │
│  QuotaEnforcer.canConsume()                  │
│                                               │
│  → Business rules                            │
│  → Invariants                                │
│  → Domain events                             │
└──────────────────────────────────────────────┘
```

## Use Cases

### `StartSessionUseCase`

Starts a new generation session. Prepares the acquisition context and creates the `Session` aggregate.

```typescript
// apps/backend/src/application/generation/start-session.usecase.ts

class StartSessionUseCase {
  constructor(
    private sessionRepo: SessionRepository,
    private workspaceRepo: WorkspaceRepository,
    private toolRegistry: ToolRegistry,
    private assetResolver: AssetResolver,
  ) {}

  async execute(cmd: StartSessionCommand): Promise<StartSessionResult> {
    // 1. Idempotency check
    const key = IdempotencyKey.from(cmd.userId, cmd.workspaceId, cmd.toolKey, cmd.inputs);
    const existing = await this.sessionRepo.findByIdempotencyKey(key);
    if (existing) return { session: existing, tool: this.toolRegistry.get(cmd.toolKey)! };

    // 2. Load tool
    const tool = this.toolRegistry.get(cmd.toolKey);
    if (!tool) throw new ToolNotFoundError(cmd.toolKey);

    // 3. Acquire data
    const acquisitionData = await this.acquire(cmd, tool);

    // 4. Validate readiness — delegates entirely to domain VO
    const policy = ReadinessPolicy.from(tool);
    const readiness = policy.evaluate(acquisitionData);
    if (!readiness.isReady) throw new ReadinessError(readiness.missing);

    // 5. Create session
    const session = Session.create(cmd.toolKey, cmd.workspaceId, cmd.userId, key);
    await this.sessionRepo.save(session);

    return { session, tool, acquisitionData };
  }

  private async acquire(cmd: StartSessionCommand, tool: ToolDefinition): Promise<AcquisitionData> {
    return {
      userInputs: cmd.inputs.text ?? {},
      fileContents: await this.parseFiles(cmd.inputs.files ?? []),  // infra: bytes → ParsedFile[]
      apiResponses: await this.callApis(tool.acquisition.apiCalls ?? [], cmd.inputs),
      resolvedAssets: await this.assetResolver.resolve(cmd.workspaceId, tool),
    };
  }
  // Note: validateReadiness() removed — logic lives in ReadinessPolicy domain VO
}

type StartSessionCommand = {
  userId: string;
  workspaceId: string;
  toolKey: string;
  inputs: {
    text?: Record<string, string>;
    files?: { key: string; content: Buffer }[];
  };
};
```

### `ProcessStepUseCase`

Executes a single processing step. Called by the `executeStep` actor in the [[Session Machine (XState v5)|XState machine]].

```typescript
// apps/backend/src/application/generation/process-step.usecase.ts

class ProcessStepUseCase {
  constructor(
    private contextEnricher: ContextEnricher,
    private llmGateway: LlmGateway,
    private fileParser: FileParser,
  ) {}

  async execute(cmd: ProcessStepCommand): Promise<Artifact> {
    const step = cmd.step;

    // 1. Enrich context
    const context = this.contextEnricher.enrich({
      step,
      previousResults: cmd.previousResults,
      acquisitionData: cmd.acquisitionData,
    });
    // serial:  previousResults only
    // hybrid:  previousResults + acquisitionData.apiResponses

    // 2. Execute prompt
    const output = await this.llmGateway.generate({
      model: step.prompt.model,
      template: step.prompt.template,
      context,
      timeout: step.execution.timeoutMs,
    });

    // 3. Return artifact — role is positional, determined by Session.addArtifact()
    return Artifact.create(
      StepNumber.of(cmd.step.order),
      output,
    );
  }
}

type ProcessStepCommand = {
  session: Session;
  step: StepDefinition;
  previousResults: Artifact[];
  acquisitionData: AcquisitionData;
};
```

### `PromoteToAssetUseCase`

Cross-context: promotes a `final` [[Artifact]] from a completed [[Session]] into a reusable [[Asset]] in [[Workspace & Assets]]. Invoked via `POST /api/artifacts/:id/promote`.

> **Implemented** (2026-08-06) — explicit user-triggered promotion. EventBus auto-promotion (`SessionCompleted → PromoteToAssetUseCase`) is deferred; see [[Asset Promotion]].

```typescript
// apps/backend/src/application/workspace/promote-to-asset.usecase.ts

class PromoteToAssetUseCase {
  constructor(
    private sessionRepo: SessionRepository,
    private workspaceRepo: WorkspaceRepository,
    private assetRepo: AssetRepository,
  ) {}

  async execute(cmd: PromoteToAssetCommand): Promise<PromoteToAssetResult> {
    // 1. Find the session that owns this artifact
    const session = await this.sessionRepo.findByArtifactId(cmd.artifactId);
    if (!session) throw new ArtifactNotFoundError(cmd.artifactId);

    // 2. Verify session is completed
    if (!session.status.equals(SessionStatus.Completed))
      throw new SessionNotCompletedError(session.sessionId, session.status.toString());

    // 3. Get tool and check if it produces an asset
    const tool = getTool(session.toolKey);
    if (!tool?.produces) throw new ToolNotPromotableError(session.toolKey.value);

    // 4. Validate asset type from tool config (domain-driven)
    const assetType = AssetType.from(tool.produces);

    // 5. Verify workspace membership
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(cmd.workspaceId);
    if (!workspace.isMember(cmd.userId))
      throw new NotAWorkspaceMemberError(cmd.userId, cmd.workspaceId);

    // 6. Create asset with full provenance
    const asset = Asset.create({
      workspaceId: cmd.workspaceId,
      assetType,
      source: AssetSource.Generated,
      content: artifact.content,
      sourceSessionId: session.sessionId,
      sourceArtifactId: cmd.artifactId,
    });

    await this.assetRepo.save(asset);
    return { assetId, assetType, workspaceId, created };
  }
}
```

**Errors raised**:

| Error | Code | Trigger |
|-------|------|---------|
| `ArtifactNotFoundError` | `ARTIFACT_NOT_FOUND` | Artifact ID not found in any session |
| `SessionNotCompletedError` | `INVALID_STATE` | Session is not in `completed` status |
| `ToolNotPromotableError` | `VALIDATION_ERROR` | Tool does not have `produces` set |
| `WorkspaceNotFoundError` | `WORKSPACE_NOT_FOUND` | Workspace does not exist |
| `NotAWorkspaceMemberError` | `FORBIDDEN` | User is not a member of the workspace |

## Complete Flow

```
User submits tool
       │
       ▼
StartSessionUseCase.execute()
  ├── IdempotencyKey check
  ├── ToolRegistry.get(toolKey)
  ├── AssetResolver.resolve(workspaceId, tool)  ← cross-context (sync)
  ├── API calls (if acquisition.apiCalls)
  ├── File parsing
  ├── Session.create()
  └── Returns { session, tool, acquisitionData }
       │
       ▼
SessionOrchestrator.start()
  └── createActor(sessionMachine, { input: { session, tool } })
       │
       ▼
sessionMachine: draft → CONFIGURE → ready → QUEUE → queued → WORKER_PICKUP → running
       │
       ▼ (loop per ogni step)
executeStep actor
  └── ProcessStepUseCase.execute()
        ├── ContextEnricher.enrich()          ← domain service
        ├── LlmGateway.generate()              ← infrastructure
        └── Returns Artifact
       │
       ▼
sessionMachine: addStepResult → persistSession
       │
       ├── (if more steps) advanceStep → executingStep (loop)
       │
└── (if last step) completeSession
              ├── Session.apply({ type: 'COMPLETE' })   ← domain: validates transition against SessionLifecycle, returns event
              ├── sessionRepo.save()
              └── eventBus.publish(SessionCompleted)
                   │
                   ├── PromoteToAssetUseCase   ← async handler
                   │     └── Workspace.addAsset()
                   │
                   └── ConsumeCreditsUseCase   ← async handler
                         └── Quota.consume()
```

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow, GenerationSystem
- [[sources/PRD]] — FR-W01 to FR-W05
- [[sources/STARTUP]] — Domain rules, API design
- [[sources/USER-STORIES]] — US-GF01 to US-GF04
