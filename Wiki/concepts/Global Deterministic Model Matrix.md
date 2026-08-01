---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/modeling
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# Global Deterministic Model Matrix

> Canonical per-step LLM model assignment for all generation steps in `[[Content Generation]]`.

## Definition

The **Global Deterministic Model Matrix** is a static contract that maps every tool step to an explicit model tier and fallback policy. It eliminates implicit/default model selection and guarantees replayable behavior across environments.

## Why It Exists

Current documentation already supports per-step model override, but coverage is partial. The matrix closes the gap by defining model assignment for every step in the tool catalog.

Without the matrix:

- New steps can silently inherit unintended defaults.
- Cost/performance behavior drifts between tools.
- Replay/debug becomes harder because model choice is not guaranteed by contract.

## Contract

Each step in `ToolDefinition.steps[]` must include:

- `prompt.model`: explicit tier (`small`, `medium`, `large`).
- `prompt.fallback`: ordered fallback tiers for transient failures.
- `prompt.timeoutMs`: step timeout budget by tier.

No step is allowed to depend on a global implicit default.

## Matrix Scope

- Applies to all content, asset, and analysis tools.
- Applies to every elaboration step and final step.
- Stored in static tool configuration, not in runtime request payload.

## Enforcement Rules

1. Startup validation fails if any step has no explicit model tier.
2. CI fails if a new step is added without matrix coverage.
3. Runtime logs persist the resolved model per step for audit.
4. Versioned prompt + model assignment define the deterministic execution contract.

## Integration Points

- `[[Tool as Static Configuration]]`: source of per-step model metadata.
- `[[LLM Gateway - OpenRouter]]`: resolves provider/model from tier and executes fallback order.
- `[[Application Services]]`: passes step-level model contract into execution.
- `[[Prompt Versioning]]`: model assignment and template version are both replay-critical inputs.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Global coverage** | Every step is assigned explicitly |
| **Deterministic execution** | Same input + same prompt version + same matrix = same behavior class |
| **Governed change** | Matrix updates are versioned configuration changes, not ad-hoc runtime changes |
| **Cost control** | Tier policy is centralized and reviewable |

## Sources

- [[sources/PRD]] — FR-W06 (partial) and FR-W07 (proposal)
- [[sources/USER-STORIES]] — planned global model assignment stories
- [[Tool as Static Configuration]] — static step configuration model
- [[LLM Gateway - OpenRouter]] — tier mapping and fallback behavior
- [[Application Services]] — step execution orchestration
