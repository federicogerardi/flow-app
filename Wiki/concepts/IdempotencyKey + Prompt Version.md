---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
  - wiki/idempotency
date_updated: 2026-08-01
source_count: 6
confidence: high
---

# IdempotencyKey + Prompt Version

> How [[Prompt Versioning|template versioning]] affects the [[IdempotencyKey]] contract — and why the version MUST be included in the hash.

## Definition

The `[[IdempotencyKey]]` ensures that repeated submissions of the same tool with the same inputs produce exactly one [[Session]]. With prompt versioning, a new question arises: **should the idempotency key include the template version?**

## The Problem

Consider this scenario:

```
Day 1: User runs landing-funnel with inputs {keyword: "automation", file: "briefing.txt"}
       → Template opt-in v1.1.0 is used
       → Session S1 created, artifacts produced

Day 2: Admin publishes opt-in v1.2.0 (fixed a hallucination in the CTA generation)
       → User re-submits the EXACT same inputs
```

**If the idempotency key does NOT include the version:**
- The system finds the existing session S1
- Returns the OLD artifacts (produced with v1.1.0)
- The user never benefits from the template fix
- Silent data staleness — the user thinks they got the latest version

**If the idempotency key DOES include the version:**
- `IdempotencyKey(userId, workspaceId, toolKey, inputHash)` → `IdempotencyKey(userId, workspaceId, toolKey, inputHash, templateVersion)`
- Day 2 submission produces a DIFFERENT key (v1.2.0 ≠ v1.1.0)
- A new session is created, using the updated template
- The user gets fresh artifacts with the latest prompt

## Decision: Include Template Version

The prompt version is **part of the generation contract**. Changing the template version changes the behavior of the tool. Idempotency means "same inputs → same behavior → same result." If the behavior changes (new template version), the result is not guaranteed to be the same.

### Updated IdempotencyKey

```typescript
// packages/domain/src/generation/value-objects/IdempotencyKey.ts

class IdempotencyKey {
  private constructor(readonly keyHash: string) {}

  /**
   * Generates an idempotency key from the full generation contract.
   *
   * The key includes the template version because changing the prompt
   * changes the generation behavior — a new version means a new session
   * even with identical user inputs.
   */
  static generate(params: IdempotencyKeyParams): IdempotencyKey {
    const components = [
      params.userId,
      params.workspaceId,
      params.toolKey,
      params.inputHash,           // hash of all user inputs
      params.templateVersions,    // NEW: hash of (templateId → version) for all steps
    ].join('|');

    return new IdempotencyKey(sha256(components));
  }
}

type IdempotencyKeyParams = {
  userId: string;
  workspaceId: string;
  toolKey: string;
  inputHash: string;                       // hash of { text: {...}, files: {...} }
  templateVersions: string;                // NEW: sorted "stepLabel:version" pairs, hashed
};
```

### Computing templateVersions

```typescript
// In StartSessionUseCase, before creating the Session:

function computeTemplateVersions(tool: ToolDefinition): string {
  const versionPairs = tool.steps
    .map(step => {
      const version = step.prompt.version ?? 'latest';
      return `${step.label}:${version}`;
    })
    .sort()  // deterministic ordering
    .join(',');

  return sha256(versionPairs);
  // Example: sha256("extraction:1.0.0,opt-in:1.2.0,quiz:1.0.0,vsl:1.0.0")
}
```

## What About `"latest"`?

`"latest"` is a moving target — it points to different concrete versions over time. This creates a problem:

```
Session created with idempotencyKey containing "latest"
→ Later: "latest" symlink changes from v1.1.0 → v1.2.0
→ Same userId + inputs + "latest" produces the same key?
→ System returns old session S1 (created when "latest" was v1.1.0)
→ User gets artifact from v1.1.0, but expects v1.2.0
```

### Resolution: Resolve "latest" at Key Generation Time

When building the idempotency key, `"latest"` is always resolved to its concrete version:

```typescript
function computeTemplateVersions(
  tool: ToolDefinition,
  promptRepo: PromptTemplateRepository,
): Promise<string> {
  const pairs: string[] = [];

  for (const step of tool.steps) {
    const templateId = PromptTemplateId.from(tool.toolKey, step.label);
    let version = step.prompt.version ?? 'latest';

    // Resolve "latest" to concrete version at key generation time
    if (version === 'latest' || PromptVersion.from(version).isLatest) {
      const versions = await promptRepo.listVersions(templateId);
      const concreteVersion = versions[versions.length - 1];
      if (!concreteVersion) {
        throw new PromptTemplateNotFoundError(templateId, PromptVersion.LATEST);
      }
      version = concreteVersion.value;
    }

    pairs.push(`${step.label}:${version}`);
  }

  return sha256(pairs.sort().join(','));
}
```

This means the idempotency key always contains **concrete, pinned versions** — even if the `ToolDefinition` references `"latest"`. The key is deterministic and immutable once created.

## Impact on Session Lookup

```sql
-- BEFORE: idempotency lookup without version
SELECT session_id FROM idempotency_keys
WHERE key_hash = $1
  AND expires_at > NOW();

-- AFTER: same query — the key_hash already includes versions
SELECT session_id FROM idempotency_keys
WHERE key_hash = $1
  AND expires_at > NOW();
```

**No schema change required.** The `idempotency_keys` table stores the hash as-is. The version information is embedded inside the hash — transparent to the database layer.

## When This Matters

| Scenario | Same key? | Correct? |
|----------|-----------|----------|
| User retries same tool + same inputs, no template change | ✅ Yes (same version hash) | Correct — cached session returned |
| User retries same tool + same inputs, template updated | ❌ No (version hash differs) | Correct — new session with updated prompt |
| User retries same tool + same inputs, `"latest"` changed | ❌ No (resolved to different concrete version) | Correct — new session |
| User changes one input field | ❌ No (inputHash differs) | Correct — new session |
| Admin rolls back template version | ❌ No (version hash reversed) | Correct — new session with reverted prompt |

## Development Opt-Out

For development environments, an opt-out flag allows excluding the version from the key:

```typescript
// .env
IDEMPOTENCY_INCLUDE_PROMPT_VERSION=false   # dev only — cache across version changes

// In IdempotencyKey.generate():
if (process.env.IDEMPOTENCY_INCLUDE_PROMPT_VERSION === 'false') {
  // DEV MODE: exclude version — useful for iterating on templates
  // without creating new sessions for every version bump
  logger.warn('Idempotency key excludes prompt version — DEV MODE ONLY');
  return new IdempotencyKey(sha256(componentsWithoutVersion));
}
```

This is a **development convenience only**. Production never sets this flag.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Version in key by default** | Template version is part of the generation contract |
| **`latest` resolved at key time** | Never store `latest` in the hash — always resolve to concrete version |
| **No schema change** | `idempotency_keys.key_hash` stores the hash as-is |
| **Opt-out for dev** | `IDEMPOTENCY_INCLUDE_PROMPT_VERSION=false` for faster iteration |
| **Production enforcement** | A startup check ensures the flag is NOT set in production |

## Sources

- [[IdempotencyKey]] — Existing VO being extended
- [[Prompt Versioning]] — Template versions included in the key
- [[Idempotency Implementation]] — Database schema and lookup logic
- [[Application Services]] — StartSessionUseCase computes the key
- [[Tool as Static Configuration]] — ToolDefinition.steps provides version info
- [[prompting-mechanics-proposal]] — Open question resolved by this page