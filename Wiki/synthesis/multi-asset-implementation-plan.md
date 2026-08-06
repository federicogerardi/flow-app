---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/generation
  - wiki/workspace
date_updated: 2026-08-06
source_count: 8
confidence: high
---

# Implementation Plan: Multi-Asset Promotion

## Overview
Enable tools to consume multiple promoted assets of the same type (e.g. 3 buyer personas) instead of the current 1:1 constraint. Changes span domain types, DB schema, backend resolution, and frontend asset selection UI. The feature is backwards-compatible — existing tools with single-asset inputs continue to work unchanged.

## Pre-Implementation Decisions (resolved 2026-08-06)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | `resolvedAssets` type: always `Map<string, string[]>`? | **Yes** — single assets become `[content]` | Break is controlled: 3 consumers, all in plan |
| D2 | Asset selection: explicit or auto-resolve? | **Explicit only** — user must select. Per-type config via `multiple` flag on `AssetInput` | `multiple: false` = radio (single-select, e.g. brief). `multiple: true` = checkboxes (multi-select, e.g. personas). Required assets block submit until selected; optional assets accept 0-n |
| D3 | `AssetResolver.resolve()` without `selectedAssetIds`: return all or one? | **All** — `Map<string, string[]>` supports natively | All consumers updated; no legacy code to protect |
| D4 | `multiple: false` + 2+ assets of same type in workspace: error or radio? | **Radio button UI** — domain doesn't limit, UI enforces single-select | Simple: resolver returns all, UI filters to at most 1 via selectedAssetIds |
| D5 | `Workspace._assets`: keep, align, or deprecate? | **Keep as-is** — snapshot read-only | No dual-write. `PromoteToAssetUseCase` persists via `AssetRepository`; workspace reloads on next fetch |

## Type Design Review (2026-08-06)

Three findings from invariant + encapsulation analysis:

| # | Finding | Severity | Fix integrated in |
|---|---------|----------|-------------------|
| **F1** | `AssetResolver` silently drops invalid `selectedAssetIds` — no error if caller passes non-existent asset IDs | Medium | Step 7: validate IDs, throw `InvalidAssetSelectionError` |
| **F2** | `PromoteToAssetUseCase` returns wrong `assetId` on UPSERT — `Asset.create()` generates new UUID but DB keeps existing row's ID | Medium | Step 8: pre-check by `source_ref` before `Asset.create()`, return existing data on match |
| **F3** | `created: boolean` field dead code — API hardcodes `promoted: true`, frontend never reads it | Low | Step 8: remove from `PromoteToAssetResult` |

**Type invariants verified**:
- `Map<string, string[]>` eliminates null/undefined ambiguity — empty array means "no assets of this type". All 3 consumers (`ReadinessPolicy`, `AssetResolver`, `ContextEnricher`) updated
- `AssetInput.multiple` is orthogonal to `required` — all 4 combinations are valid states. No discriminated union needed
- `ReadinessPolicy` is defensive: `.get(type) ?? []` handles missing Map keys gracefully
- No new class VOs needed — `AssetSelection` as a class would add ceremony without invariants; `string[]` is sufficient for the selected-asset-IDs use case

## Requirements

**Selection UX per asset type** (D2):

| `multiple` | `required` | UI Component | Submit blocked if |
|-----------|-----------|-------------|-------------------|
| `false` | `true` | Radio button (1 only) | No selection |
| `false` | `false` | Radio button (0-1) | Never |
| `true` | `true` | Checkboxes (≥1) | No selection |
| `true` | `false` | Checkboxes (0-n) | Never |

- `AssetInput` supports `multiple: true` flag — allows N assets of same type
- `ReadinessPolicy` enforces `required` + `multiple` correctly (at least 1 when required, 0 when optional)
- DB constraint `UNIQUE (workspace_id, asset_type)` replaced with `UNIQUE (workspace_id, asset_type, source_ref)` — multiple same-type assets allowed, dedup by artifact source
- `PromoteToAssetUseCase` no longer overwrites existing assets of the same type
- `AssetResolver` returns `Map<string, string[]>` when `multiple: true`
- `ContextEnricher` injects multiple assets of same type with index labels
- `StartSessionUseCase` resolves `selectedAssets` from the request through `AssetResolver`
- Frontend `SetupPanel` gains an asset picker with radio/checkbox support per type
- `ToolPageLayout` manages `selectedAssets` state and includes them in `startSession()`

## Architecture Changes

- **Modified type**: `AssetInput` (`packages/domain/.../tool-definition.ts:23`) — adds `multiple?: boolean`
- **Modified type**: `AcquisitionData.resolvedAssets` (`packages/domain/.../ReadinessPolicy.ts:7`) — `Map<string, string>` → `Map<string, string[]>`
- **Modified type**: `SessionJobData.resolvedAssets` (`apps/backend/.../session-worker.ts:18`) — `Record<string, string>` → `Record<string, string[]>`
- **Modified entity method**: `Workspace.getAssetByType()` → `getAssetsByType()` (`packages/domain/.../Workspace.ts:174`) — returns `Asset[]` instead of `Asset | null`
- **Modified repository method**: `AssetRepository.findByWorkspaceAndType()` → `findByWorkspaceAndType()` (`packages/domain/.../AssetRepository.ts:7`) — returns `Asset[]`
- **New migration**: `011_multi_asset.sql` — drops old unique constraint, creates new one
- **New error class**: `InvalidAssetSelectionError` (`packages/domain/.../AssetResolver.ts`) — thrown when `selectedAssetIds` contains IDs not found in workspace assets
- **New UI component**: Asset picker section inside `SetupPanel` — radio buttons for single-select types, checkboxes for multi-select types. Controlled by `AssetInput.multiple` flag per type

## Implementation Steps

### Phase 1: Domain Foundation (3 files — no DB, no API, no UI)

1. **Add `multiple` to `AssetInput` type** (File: `packages/domain/src/generation/tools/tool-definition.ts`)
   - Action: Add `multiple?: boolean` field to `AssetInput` interface (default `false`, backward compat)
   - Why: Single field controls all multi-asset behavior downstream
   - Dependencies: None
   - Risk: Low — optional field, no consumers until opted in

2. **Update `AcquisitionData.resolvedAssets` to `Map<string, string[]>`** (File: `packages/domain/src/generation/value-objects/ReadinessPolicy.ts`)
   - Action: Change `resolvedAssets: Map<string, string>` → `Map<string, string[]>`. Update `evaluate()` asset check to iterate array entries and check for at least 1 element when `required: true`
   - Why: Core type change — everything downstream depends on this
   - Dependencies: Step 1 (needs `multiple` field to decide behavior? No — evaluate just checks `required` and presence. `multiple` is relevant only for UI readiness count)
   - Risk: Medium — changes the shape consumed by 3 other files (`AssetResolver`, `ContextEnricher`, worker)

3. **Update `ContextEnricher` for multi-asset injection** (File: `packages/domain/src/generation/domain-services/ContextEnricher.ts`)
   - Action: Change inner loop from single `parts.push(...)` to nested loop with index labeling: `[Asset - persona #1]\n...\n[Asset - persona #2]\n...`
   - Why: Multiple assets of the same type must be distinguishable in the LLM prompt
   - Dependencies: Step 2 (must match new `Map<string, string[]>` type)
   - Risk: Low — pure function, deterministic

### Phase 2: Database (2 files)

4. **Create migration `011_multi_asset.sql`** (File: `packages/infra-db/migrations/011_multi_asset.sql`)
   - Action:
     ```sql
     ALTER TABLE assets DROP CONSTRAINT uq_assets_workspace_type;
     ALTER TABLE assets ADD CONSTRAINT uq_assets_workspace_type_source
       UNIQUE (workspace_id, asset_type, source_ref);
     ```
   - Why: Existing `UNIQUE (workspace_id, asset_type)` prevents multiple rows with same type. New constraint deduplicates by `source_ref` (artifact ID) — same artifact promoted twice = UPSERT, different artifact = new row. `source_ref` can be NULL for manual assets — multiple NULLs are allowed in PostgreSQL UNIQUE constraints.
   - Dependencies: None (runs before code changes, backward-compatible — existing rows satisfy new constraint)
   - Risk: Medium — irreversible. Must be tested with: existing single-asset workspaces, manual assets with NULL source_ref, promotion idempotency

5. **Update `KyselyAssetRepository`** (File: `packages/infra-db/src/repositories/asset-repository.ts`)
   - Action 1: Change `findByWorkspaceAndType` return type from `Asset | null` to `Asset[]` — remove `.executeTakeFirst()`, use `.execute()` and map all rows
   - Action 2: Change `save()` ON CONFLICT columns from `['workspace_id', 'asset_type']` to `['workspace_id', 'asset_type', 'source_ref']`
   - Why: Match the new DB constraint
   - Dependencies: Step 4 (migration must run first)
   - Risk: Low — ON CONFLICT change is a 1-line diff

### Phase 3: Workspace Domain (2 files)

6. **Change `Workspace.getAssetByType()` → `getAssetsByType()`** (File: `packages/domain/src/workspace/entities/Workspace.ts`)
   - Action: Rename method to `getAssetsByType(assetType: AssetType): Asset[]`, change implementation from `.find()` to `.filter()`. Keep old method as deprecated forwarding to new one for backward compat, or remove since it has few callers
   - Why: Domain entity must expose the multi-asset reality. `ReadonlyArray<Asset>` getter already exists — this is just a filtered query
   - Dependencies: Step 2 (interface change)
   - Risk: Low — method rename, callers are in `AssetResolver` (already being changed) and `PromoteToAssetUseCase`

7. **Update `AssetResolver.resolve()` for multi-asset** (File: `packages/domain/src/workspace/domain-services/AssetResolver.ts`)
    - Action:
      - Change return type from `Promise<Map<string, string>>` to `Promise<Map<string, string[]>>`
      - Add optional `selectedAssetIds?: string[]` parameter — if provided, filter assets by those IDs
      - **F1 fix**: If `selectedAssetIds` is provided, validate every ID exists among the workspace assets of the declared types. Throw `InvalidAssetSelectionError` (extends `DomainError`, code `ASSET_NOT_FOUND`, `retryable: false`) for any ID that doesn't match. This prevents silent asset drops from API misuse or stale selections
      - Iterate `getAssetsByType(type)` (now returning `Asset[]`) instead of `getAssetByType(type)`
      - For each matching asset, push content into the array for that type
      - Throw `MissingRequiredAssetError` only if `mapping.required && assets.length === 0`
    - Why: Domain service is the single entry point for resolving workspace assets into session context. Validation at this boundary catches bugs early
    - Dependencies: Steps 2, 6

### Phase 4: Application Layer (2 files)

8. **Update `PromoteToAssetUseCase` — remove overwrite, fix idempotency** (File: `apps/backend/src/application/workspace/promote-to-asset.usecase.ts`)
    - Action:
      - **F2 fix (assetId mismatch)**: Before `Asset.create()`, query existing assets of this type and check if THIS artifact was already promoted by matching `sourceArtifactId === cmd.artifactId`. If found, return the existing asset's data immediately (idempotent — same request → same assetId). This prevents the `Asset.create()` UUID from diverging from the actual DB row on UPSERT
      - **F3 fix (dead code)**: Remove `created: boolean` from `PromoteToAssetResult` — it is never consumed by the API handler (which hardcodes `promoted: true`) or the frontend
      - Remove the old `findByWorkspaceAndType` check (line 90) that was used only for the `created` flag
      - If asset is new (no existing match on `source_ref`): `Asset.create()` → `assetRepo.save()`. The ON CONFLICT `(workspace_id, asset_type, source_ref)` handles concurrent retries at DB level
    - Why: Multi-asset means multiple same-type assets can coexist. The existing check was for overwrite detection — now replaced by source_ref matching for idempotency. The assetId mismatch bug (F2) becomes visible with multi-asset because different artifacts of the same type produce different rows
    - Dependencies: Step 5 (repository ON CONFLICT change to include `source_ref`)

9. **Update `StartSessionUseCase` — resolve assets** (File: `apps/backend/src/application/generation/start-session.usecase.ts`)
   - Action:
     - Add `WorkspaceRepository` to constructor (or `AssetResolver` directly — inject whichever the DI prefers)
     - Before readiness check, if `cmd.inputs.selectedAssets?.length > 0`: create `AssetResolver`, call `resolve(workspaceId, tool, cmd.inputs.selectedAssets)`, populate `acquisitionData.resolvedAssets`
     - Update `AcquisitionData.resolvedAssets` from `new Map()` to the resolved result
   - Why: This is the missing piece — assets are currently never resolved before session start. Readiness check currently always sees empty `resolvedAssets`
   - Dependencies: Steps 2, 7 (AssetResolver must accept `selectedAssetIds`)
   - Risk: Medium — changes the constructor signature, requires DI update

### Phase 5: Backend API + Worker (3 files)

10. **Serialize `assets` in `listTools` response** (File: `apps/backend/src/api/generation.ts`, lines 22-51)
    - Action: Add `assets` to the `acquisition` object in the mapped response:
      ```typescript
      assets: tool.acquisition.assets?.map((a) => ({
        assetType: a.assetType,
        required: a.required,
        multiple: a.multiple ?? false,
      })) ?? [],
      ```
    - Why: Frontend needs to know which asset types the tool requires to render the picker
    - Dependencies: Step 2 (AssetInput has `multiple` field)
    - Risk: Low

11. **Pass `resolvedAssets` to the worker job** (File: `apps/backend/src/api/generation.ts`, lines 191-232)
    - Action:
      - After `startSessionUC.execute()`, the use case returns resolved assets. Convert `Map<string, string[]>` to `Record<string, string[]>` for BullMQ serialization:
        ```typescript
        const resolvedAssets: Record<string, string[]> = {};
        for (const [type, contents] of result.resolvedAssets.entries()) {
          resolvedAssets[type] = contents;
        }
        ```
      - Pass to `enqueueSession(sessionId, { ...acquisitionData, resolvedAssets })`
    - Why: The worker needs resolved asset content for `ContextEnricher`
    - Dependencies: Step 9 (use case must return resolved assets)
    - Risk: Low — serialization change, BullMQ handles JSON arrays natively

12. **Update `SessionJobData` and worker reconstruction** (File: `apps/backend/src/generation/worker/session-worker.ts`)
    - Action 1: Change `SessionJobData.resolvedAssets` from `Record<string, string>` to `Record<string, string[]>`
    - Action 2: Update line 180 `new Map(Object.entries(...))` — this already works with arrays since `Object.entries({persona: ['c1', 'c2']})` → `[['persona', ['c1', 'c2']]]` → `Map { 'persona' => ['c1', 'c2'] }`. No code change needed, just the type.
    - Why: Type safety for the worker contract
    - Dependencies: Steps 2, 11
    - Risk: Low — type-only change, runtime behavior identical

### Phase 6: Frontend (6 files)

13. **Add `assets` to `fetchToolDefinitions` response type** (File: `apps/frontend/src/components/tool/SetupPanel.tsx`, lines 164-194)
    - Action: Add `assets: Array<{ assetType: string; required: boolean; multiple?: boolean }>` to `ApiToolResponse.acquisition`. Map it through in the destructured result. Export a new `AssetDef[]` type alongside `ToolDefinitionData`
    - Why: SetupPanel needs to know which asset types the tool consumes
    - Dependencies: Step 10 (backend must serialize assets)
    - Risk: Low

14. **Build asset picker section in `SetupPanel`** (File: `apps/frontend/src/components/tool/SetupPanel.tsx`)
    - Action: Add a new `"Workspace Assets"` section below file inputs. For each `assetDef`:
      - Fetch workspace assets via `useSWR('assets-${workspaceId}', () => api.listAssets(workspaceId))` — add `workspaceId` prop to `SetupPanelProps`
      - Filter assets by `assetDef.assetType`
      - Render **radio buttons** if `multiple: false` (single select, e.g. brief, brand-voice) or **checkboxes** if `multiple: true` (multi select, e.g. personas)
      - Show asset metadata: type label + creation date
      - If no assets of type exist: show CTA button linking to the tool that generates that asset (use `ASSET_TOOL_MAP` from `AssetCoverageBar`)
      - Add `selectedAssets: string[]` and `onAssetChange: (ids: string[]) => void` props
      - For radio (single) types: selecting one automatically deselects any previously selected of same type (standard radio behavior, or filter by type in onChange)
    - Why: Core UI for multi-asset selection — this is the user-facing feature. Per-type `multiple` flag controls the interaction model
    - Dependencies: Step 13 (needs `assetDef` from API)

15. **Add asset readiness to `ReadinessSnapshot`** (File: `apps/frontend/src/components/tool/ReadinessSnapshot.tsx`)
    - Action:
      - Add `assetDef?: Array<{ assetType: string; required: boolean; multiple?: boolean }>` and `selectedAssets?: string[]` and `workspaceAssets?: AssetDTO[]` props
      - Add asset readiness rows: for each required asset type, show check/cross with count (e.g. "✅ Persona: 2 selezionati", "❌ Brand Voice: 0/1 (obbligatorio)")
      - Extend `hasAnyRequired` to include asset requirements
    - Why: Users need visibility into which assets they still need to select
    - Dependencies: Step 14 (same props)
    - Risk: Low — pattern identical to existing text/file readiness

16. **Wire `selectedAssets` state in `ToolPageLayout`** (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
    - Action:
      - Add `[selectedAssets, setSelectedAssets] = useState<string[]>([])` state
      - Add `[assetDef, setAssetDef] = useState<AssetDef[]>([])` from `fetchToolDefinitions`
      - Pass `selectedAssets`, `onAssetChange`, `assetDef`, `workspaceAssets` to `SetupPanel`
      - Pass `assetDef`, `selectedAssets`, `workspaceAssets` to `ReadinessSnapshot`
      - In `handleSubmit`: include `selectedAssets` in the `inputs` object sent to `api.startSession()`
      - Extend `requiredMissing` check: `assetMissing = assetDef.some(a => a.required && countByType(a.assetType) === 0)`
      - Fetch workspace assets once and pass down: `useSWR('assets-${workspaceId}', () => api.listAssets(workspaceId))`
    - Why: ToolPageLayout is the orchestrator — must manage the new state and wire it to children
    - Dependencies: Steps 13, 14, 15
    - Risk: Medium — wiring is straightforward but touches the main orchestration flow. Must not break existing text/file-only tools

17. **Remove per-type exclusive constraint in `KnowledgePanel`** (File: `apps/frontend/src/components/tool/KnowledgePanel.tsx`)
    - Action: In `handleToggle`, remove lines 30-33 that filter out existing selections of the same type. When `checked: true`, simply append the asset ID without removing same-type siblings
    - Why: KnowledgePanel currently enforces single-select per type. Multi-asset tools need multi-select
    - Dependencies: None (independent UI fix)
    - Risk: Low — 2 lines removed, all other tools remain single-select by convention (they only have one asset per type anyway)

18. **Show count in `AssetCoverageBar`** (File: `apps/frontend/src/components/workspace/AssetCoverageBar.tsx`)
    - Action: Change `presentTypes: Set<string>` to count map. Change label from `ASSET_LABELS[type]` to include count: `"Persona (3)"`. Change progress bar from binary (0/100) to proportional (count/maxCount — or just keep 100% if any are present). Adjust check icon logic
    - Why: With multiple same-type assets, showing just "present/absent" is misleading. Count gives users useful information
    - Dependencies: None
    - Risk: Low — cosmetic change

### Phase 7: Copy Module + DI + Contracts (3 files)

19. **Add copy keys** (File: `packages/copy/src/it/tool-page.ts`)
    - Action: Add keys:
      - `assetPicker.title` → `"Asset del workspace"`
      - `assetPicker.manageAssets` → `"Gestisci asset"`
      - `assetPicker.noAssets` → `"Nessun asset di questo tipo"`
      - `assetPicker.generateAsset` → `"Genera {type}"`
      - `readiness.assetsRequired` → `"{count} {type} richiesti"`
    - Why: Zero hardcoded strings
    - Dependencies: Steps 14, 15
    - Risk: Low

20. **Update DI wiring** (File: `apps/backend/src/api/generation.ts`, line 18)
    - Action: Change `new StartSessionUseCase(sessionRepo)` → `new StartSessionUseCase(sessionRepo, workspaceRepo)` to match the new constructor
    - Why: Use case now needs `WorkspaceRepository` to resolve assets
    - Dependencies: Step 9
    - Risk: Low — 1 line, workspaceRepo already available in scope

21. **Verify `StartSessionRequest` contract** (File: `packages/contracts/src/generation/start-session.dto.ts`)
    - Action: No change needed — `selectedAssets?: string[]` already exists at line 6
    - Why: Contract was forward-designed for this feature
    - Dependencies: None
    - Risk: None — contract is already compatible

## Testing Strategy

### Unit Tests
- `ReadinessPolicy.evaluate()` with multi-asset: required + multiple → at least 1, optional + multiple → 0 is OK
- `ReadinessPolicy.evaluate()` with empty resolvedAssets Map → missing for all required types
- `AssetResolver.resolve()` with `multiple: true` → returns `Map<string, string[]>`
- `AssetResolver.resolve()` with `multiple: false` → returns `Map<string, string[]>` with single-element arrays
- **F1 test**: `AssetResolver.resolve()` with invalid `selectedAssetIds` (non-existent IDs) → throws `InvalidAssetSelectionError`
- **F1 test**: `AssetResolver.resolve()` with valid `selectedAssetIds` → returns only those assets
- `ContextEnricher.enrich()` with multi-asset input → nested labels in output (`[Asset - persona #1]`, `[Asset - persona #2]`)
- `Workspace.getAssetsByType()` → `Asset[]` for multiple same-type assets
- `Workspace.getAssetsByType()` → `[]` for type with no assets

### Integration Tests
- `StartSessionUseCase` with `selectedAssets` → resolves and populates `acquisitionData`
- `StartSessionUseCase` without `selectedAssets` (old tools) → empty `resolvedAssets`, backward compat
- `PromoteToAssetUseCase` — promoting two different personas → two rows in DB
- **F2 test**: `PromoteToAssetUseCase` — promoting same artifact twice → returns same `assetId` both times (idempotency)
- **F2 test**: `PromoteToAssetUseCase` — promoting artifact A then artifact B (same type) → two different `assetId`s, both rows in DB
- **F3 test**: API promote response no longer includes `created` or `promoted` field → verify frontend still works (it never used them)

### E2E Tests
- Workspace with 0 personas → tool page shows "Genera Persona" CTA
- Workspace with 3 personas → tool page shows 3 checkboxes, user selects 2
- Submit session with 2 selected personas → generation prompt includes both
- Promote persona from completed session → appears in workspace assets list alongside existing ones

### DB Migration Verification
- Run migration on existing workspace with assets → no data loss
- Insert two assets with same workspace_id and asset_type but different source_ref → succeeds
- Insert two assets with same workspace_id, asset_type, and source_ref → constraint violation (or UPSERT)

## Risks & Mitigations

- **Risk**: `AcquisitionData.resolvedAssets` type change breaks BullMQ serialization for in-flight jobs
  - Mitigation: `Map<string, string[]>` serializes to `Record<string, string[]>` via standard JSON — same mechanism as today. Worker reconstruction at line 180: `new Map(Object.entries(...))` handles arrays transparently. No protocol change

- **Risk**: `Workspace.getAssetByType()` rename to `getAssetsByType()` breaks consumers I missed
  - Mitigation: Keep old method as deprecated forwarding to new one for one release cycle, or verify all call sites (there are only ~3: `AssetResolver`, `PromoteToAssetUseCase`, `KnowledgePanel`)

- **Risk**: DB migration `DROP CONSTRAINT` + `ADD CONSTRAINT` fails on existing data with duplicates
  - Mitigation: The old unique constraint `(workspace_id, asset_type)` prevents duplicates by definition — no existing duplicates exist. New constraint `(workspace_id, asset_type, source_ref)` is strictly less restrictive. Migration is safe

- **Risk**: Asset picker UI loads slowly with many assets (SWR fetch on every render)
  - Mitigation: Cache the workspace assets fetch in `ToolPageLayout` (already using SWR with key). Pass down as prop instead of re-fetching in SetupPanel. Workspace-side: max ~20 assets — not a performance concern

- **Risk**: Worker reads `resolvedAssets` from job data before migration completes in production
  - Mitigation: Deploy in order: migration → backend → frontend. Worker and API share the same deployment (monorepo). No partial-deployment issue

## Success Criteria
- [ ] **Domain**: `multiple: true` on `AssetInput` is recognized by `ReadinessPolicy`, `AssetResolver`, `ContextEnricher`
- [ ] **DB**: Two personas can coexist in `assets` table for the same workspace
- [ ] **Promotion**: Promoting a persona from a session does NOT overwrite a previously promoted persona
- [ ] **Promotion idempotency**: Promoting the same artifact twice → UPSERT (same row), not duplicate
- [ ] **Session start**: Selecting 2 personas in the UI → both appear in the generation prompt
- [ ] **Backward compat**: Existing `brief` tool (no assets in acquisition) continues to work unchanged
- [ ] **Backward compat**: Existing `AssetCoverageBar` shows correct count for single-asset workspaces
- [ ] **UI**: Asset picker renders checkboxes filtered by tool's required asset types
- [ ] **UI**: ReadinessSnapshot shows per-type asset count
- [ ] **No regressions**: All 644 vitest tests pass, tsc clean in all packages, vite build succeeds