---
type: concept
tags:
  - wiki/concept
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# ReadinessPolicy

> Value Object — [[Content Generation]] context  
> `packages/domain/src/generation/value-objects/ReadinessPolicy.ts`

## Definition

`ReadinessPolicy` encapsulates the business rule: *"Can this Session start, given the data acquired in the pre-flight phase?"* It is a **pure domain Value Object** — no infrastructure, no I/O. The Application Service delegates to it; the [[Session Machine (XState v5)|XState guard]] calls it.

This concept was previously leaked into two places: `validateReadiness` in `StartSessionUseCase` and the `canStart` guard in the XState machine. Both are now resolved by delegating to this VO.

## Structure

```typescript
// packages/domain/src/generation/value-objects/ReadinessPolicy.ts

class ReadinessPolicy {
  private constructor(private readonly tool: ToolDefinition) {}

  static from(tool: ToolDefinition): ReadinessPolicy {
    return new ReadinessPolicy(tool);
  }

  evaluate(data: AcquisitionData): ReadinessResult {
    const missing: MissingInput[] = [];

    for (const input of this.tool.acquisition.userText ?? []) {
      if (input.required && !data.userInputs[input.key]) {
        missing.push({ type: 'text', key: input.key, label: input.label });
      }
    }
    for (const input of this.tool.acquisition.files ?? []) {
      if (input.required && !data.fileContents[input.key]) {
        missing.push({ type: 'file', key: input.key, label: input.label });
      }
    }
    for (const input of this.tool.acquisition.assets ?? []) {
      if (input.required && !data.resolvedAssets.has(input.assetType)) {
        missing.push({ type: 'asset', key: input.assetType, label: input.assetType });
      }
    }

    return missing.length === 0
      ? ReadinessResult.ready()
      : ReadinessResult.notReady(missing);
  }
}

class ReadinessResult {
  private constructor(
    readonly isReady: boolean,
    readonly missing: MissingInput[],
  ) {}

  static ready(): ReadinessResult {
    return new ReadinessResult(true, []);
  }

  static notReady(missing: MissingInput[]): ReadinessResult {
    return new ReadinessResult(false, missing);
  }
}

type MissingInput = {
  type: 'text' | 'file' | 'asset';
  key: string;
  label: string;
};
```

## Usage

### In Application Service (`StartSessionUseCase`)

```typescript
// Before (wrong — business logic in application layer):
private validateReadiness(tool, data) { 
  /* inline logic */ 
}

// After (correct — delegates to domain):
const policy = ReadinessPolicy.from(tool);
const result = policy.evaluate(acquisitionData);
if (!result.isReady) throw new ReadinessError(result.missing);
```

### In XState Guard (`canStart`)

```typescript
// Before (wrong — business logic in machine guard):
canStart: ({ context }) => {
  const requiredFiles = context.tool.acquisition.files?.filter(f => f.required) ?? [];
  // ... inline logic
}

// After (correct — delegates to domain):
canStart: ({ context }) => {
  const policy = ReadinessPolicy.from(context.tool);
  return policy.evaluate(context.acquisitionData).isReady;
}
```

## Invariants

- `ReadinessPolicy` is created from a `ToolDefinition` — it knows what the tool requires
- `evaluate()` is a pure function — same inputs always produce same output
- Zero side effects, zero async operations

## Sources

- [[doodle/PRD]] — FR-W01, FR-U02 (Readiness Snapshot)
- [[doodle/USER-STORIES]] — US-W05, US-QF02
- [[doodle/APP-CONCEPT]] — Readiness gate before dispatch