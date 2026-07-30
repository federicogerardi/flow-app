---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/architecture
date_updated: 2026-07-30
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
│  → Call domain objects                       │
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

Avvia una nuova sessione di generazione. Prepara il contesto di acquisizione e crea l'aggregate `Session`.

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

Esegue un singolo step di elaborazione. Chiamato dall'attore `executeStep` nella [[Session Machine (XState v5)|macchina XState]].

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

Cross-context: consuma l'evento `SessionCompleted` e promuove l'Artifact finale ad Asset.

```typescript
// apps/backend/src/application/workspace/promote-to-asset.usecase.ts

class PromoteToAssetUseCase {
  constructor(
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute(event: SessionCompleted): Promise<void> {
    // tool.produces declares whether this tool creates a promotable Asset (domain knowledge)
    const tool = this.toolRegistry.get(event.toolKey);
    const assetType = tool?.produces; // undefined for content / analysis tools
    if (!assetType) return;

    const workspace = await this.workspaceRepo.findById(event.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(event.workspaceId);

    workspace.addAsset(
      AssetContent.from(event.finalArtifact.content),
      assetType,
      AssetSource.Generated,
      event.finalArtifact.artifactId,
    );

    await this.workspaceRepo.save(workspace);

    eventBus.publish(new AssetCreated(workspace.workspaceId, assetType));
  }
}
```

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
sessionMachine: draft → CONFIGURE → ready → START → running
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
             ├── Session.complete()            ← domain: validate, emit event
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

- [[doodle/APP-CONCEPT]] — BE-Driven workflow, GenerationSystem
- [[doodle/PRD]] — FR-W01 to FR-W05
- [[doodle/STARTUP]] — Domain rules, API design
- [[doodle/USER-STORIES]] — US-GF01 to US-GF04