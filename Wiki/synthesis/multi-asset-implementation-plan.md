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

## Cross-Validation Reports (2026-08-06)

| Review | Verdict | Blockers | Medium | Low |
|--------|---------|----------|--------|-----|
| Type Design Audit | ✅ Approved | 0 | 3 (F1-F3) | 0 |
| Backend Architect | ✅ Approved with changes | 2 (BA-C1, BA-C2) | 3 (BA-C3 to BA-C5) | 3 |
| Frontend Engineer | ✅ Approved with changes | 2 (FE-C1, FE-C4) | 4 (FE-C2, FE-C3, FE-C5, FE-C6) | 4 |
| **Total** | **All resolved** | **15 fixes integrated** | | |

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
- **Modified type**: `StartSessionResult` (`apps/backend/.../start-session.usecase.ts:39`) — adds `resolvedAssets: Map<string, string[]>`
- **Modified type**: `SessionJobData.resolvedAssets` (`apps/backend/.../session-worker.ts:18`) — `Record<string, string>` → `Record<string, string[]>`
- **Modified entity method**: `Workspace.getAssetByType()` → `getAssetsByType()` (`packages/domain/.../Workspace.ts:174`) — returns `Asset[]` instead of `Asset | null`
- **Modified repository method**: `AssetRepository.findByWorkspaceAndType()` (`packages/domain/.../AssetRepository.ts:7`) — returns `Asset[]`
- **New migration**: `011_multi_asset.sql` — drops old unique constraint, creates new one + partial index for NULL source_ref
- **New error class**: `InvalidAssetSelectionError` (`packages/domain/.../AssetResolver.ts`) — thrown when `selectedAssetIds` contains IDs not found in workspace assets
- **New UI component**: `AssetPicker` (`apps/frontend/.../shared/AssetPicker.tsx`) — reusable radio/checkbox selector per asset type. Used by `SetupPanel` and (future) `KnowledgePanel` replacement
- **Modified error handler**: `ErrorMapper` (`apps/backend/.../error-handler.ts`) — adds `ASSET_NOT_FOUND` → 404 mapping

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
      BEGIN;

      ALTER TABLE assets DROP CONSTRAINT uq_assets_workspace_type;
      ALTER TABLE assets ADD CONSTRAINT uq_assets_workspace_type_source
        UNIQUE (workspace_id, asset_type, source_ref);

      -- Prevent multiple NULL-source manual assets per type per workspace
      -- PostgreSQL treats NULL ≠ NULL in UNIQUE constraints, so multiple
      -- (workspace_id, type, NULL) rows would be allowed without this index
      CREATE UNIQUE INDEX uq_assets_workspace_type_null_source
        ON assets (workspace_id, asset_type)
        WHERE source_ref IS NULL;

      COMMIT;
      ```
    - Why: Existing `UNIQUE (workspace_id, asset_type)` prevents multiple rows with same type. New constraint deduplicates by `source_ref` (artifact ID) — same artifact promoted twice = UPSERT, different artifact = new row. The partial unique index prevents accidental duplicates from manual asset creation (where `source_ref` is NULL). `BEGIN/COMMIT` follows existing migration conventions (`003_workspaces.sql`)
    - Dependencies: None (runs before code changes, backward-compatible — existing rows satisfy new constraint)
    - Risk: Medium — irreversible. Must be tested with: existing single-asset workspaces, manual assets with NULL source_ref, promotion idempotency. Existing assets with NULL source_ref (if any) would be caught by the partial index — run `SELECT workspace_id, asset_type, COUNT(*) FROM assets WHERE source_ref IS NULL GROUP BY workspace_id, asset_type HAVING COUNT(*) > 1;` before migration to verify no pre-existing duplicates

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
      - **F2 fix (assetId mismatch)**: Before `Asset.create()`, query all workspace assets via `findByWorkspace(workspaceId)` (not `findByWorkspaceAndType` — we need the full list to match by `sourceArtifactId`). Filter in-memory: `existingOfType.filter(a => a.assetType.equals(assetType) && a.sourceArtifactId === cmd.artifactId)`. If match found, return the existing asset's data immediately (idempotent — same request → same assetId). This prevents the `Asset.create()` UUID from diverging from the actual DB row on UPSERT
      - **F3 fix (dead code)**: Remove `created: boolean` from `PromoteToAssetResult` — it is never consumed by the API handler (which hardcodes `promoted: true`) or the frontend
      - Remove the old `findByWorkspaceAndType` check (line 90) that was used only for the `created` flag
      - If asset is new (no existing match on `sourceArtifactId`): `Asset.create()` → `assetRepo.save()`. The ON CONFLICT `(workspace_id, asset_type, source_ref)` handles concurrent retries at DB level
    - Why: Multi-asset means multiple same-type assets can coexist. The existing check was for overwrite detection — now replaced by source_ref matching for idempotency. The assetId mismatch bug (F2) becomes visible with multi-asset because different artifacts of the same type produce different rows
    - Dependencies: Step 5 (repository ON CONFLICT change to include `source_ref`)

9. **Update `StartSessionUseCase` — resolve assets** (File: `apps/backend/src/application/generation/start-session.usecase.ts`)
    - Action:
      - Add `WorkspaceRepository` to constructor (inject `AssetResolver` directly — cleaner: `new StartSessionUseCase(sessionRepo, assetResolver)`)
      - **BA-C4/FE-C4 fix**: Call `AssetResolver.resolve()` unconditionally — not gated on `selectedAssets?.length > 0`. The resolver handles all cases: no `selectedAssetIds` → returns ALL assets per type (D3), empty `[]` → same, populated → validates + filters. This ensures `resolvedAssets` is never empty when workspace has matching assets
      - Add `resolvedAssets: Map<string, string[]>` to `StartSessionResult` interface (BA-C2 fix) so the API layer can forward resolved assets to the worker
      - Replayed path: return `resolvedAssets: new Map()` — a replayed session has already been processed, no new assets to resolve
      - Populate `acquisitionData.resolvedAssets` from the resolver output before readiness check and before creating the session
    - Why: This is the missing piece — assets are currently never resolved before session start. The readiness check must see resolved assets to correctly evaluate `required` constraints
    - Dependencies: Steps 2, 7 (AssetResolver must accept `selectedAssetIds`)
    - Risk: Medium — changes the constructor signature and return type, requires DI update

### Phase 5: Backend API + Worker (4 files)

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
      - After `startSessionUC.execute()`, the use case returns resolved assets in `result.resolvedAssets` (BA-C2). Convert `Map<string, string[]>` to `Record<string, string[]>` for BullMQ serialization:
        ```typescript
        const resolvedAssets: Record<string, string[]> = {};
        for (const [type, contents] of result.resolvedAssets.entries()) {
          resolvedAssets[type] = contents;
        }
        ```
      - **BA-C5 fix**: Skip `enqueueSession()` for replayed sessions — the session has already been processed. Only enqueue new sessions:
        ```typescript
        if (!result.replayed) {
          await enqueueSession(result.session.sessionId, acquisitionData);
        }
        ```
      - This avoids re-enqueuing a completed session in the worker queue
    - Why: The worker needs resolved asset content for `ContextEnricher`. Replayed sessions don't need a new job
    - Dependencies: Step 9 (use case must return resolvedAssets in result)

12. **Update `SessionJobData` and worker reconstruction** (File: `apps/backend/src/generation/worker/session-worker.ts`)
    - Action 1: Change `SessionJobData.resolvedAssets` from `Record<string, string>` to `Record<string, string[]>`
    - Action 2: Update line 180 `new Map(Object.entries(...))` — this already works with arrays since `Object.entries({persona: ['c1', 'c2']})` → `[['persona', ['c1', 'c2']]]` → `Map { 'persona' => ['c1', 'c2'] }`. No code change needed, just the type.
    - Why: Type safety for the worker contract
    - Dependencies: Steps 2, 11

13. **Add `ASSET_NOT_FOUND` to `ErrorMapper`** (File: `apps/backend/src/infrastructure/error-handler.ts`)
    - Action: Add a case before the default fallthrough:
      ```typescript
      case 'ASSET_NOT_FOUND':
        return 404;
      ```
    - Why: `InvalidAssetSelectionError` (F1) has code `ASSET_NOT_FOUND`. Without this mapper entry, invalid asset selections would return HTTP 500 instead of 404
    - Dependencies: Step 7 (error class exists)

### Phase 6: Frontend (6 files)

14. **Add `assets` to `fetchToolDefinitions` response type** (File: `apps/frontend/src/components/tool/SetupPanel.tsx`, lines 164-194)
    - Action: Add `assets: Array<{ assetType: string; required: boolean; multiple?: boolean }>` to `ApiToolResponse.acquisition`. Map it through in the destructured result. Export the type alongside `ToolDefinitionData`
    - Why: ToolPageLayout needs to know which asset types the tool consumes to pass to AssetPicker
    - Dependencies: Step 10 (backend must serialize assets)

15. **Create `AssetPicker` shared component** — FE-C1 fix (File: `apps/frontend/src/components/shared/AssetPicker.tsx` — NEW)
    - Action: Extract a reusable `AssetPicker` component instead of inlining asset selection in `SetupPanel`. The component:
      - Props: `workspaceId`, `assetDefs: AssetDef[]`, `selectedIds: string[]`, `onChange: (ids: string[]) => void`, `disabled?: boolean`, `exclusivePerType?: boolean`
      - Fetches workspace assets internally via `useSWR('assets-${workspaceId}-picker', () => api.listAssets(workspaceId))`
      - Renders per-type sections with radio buttons (`multiple: false`) or checkboxes (`multiple: true`)
      - Shows asset metadata (type label, creation date) for each asset
      - Empty state per type: CTA "Genera {type}" linking via `ASSET_TOOL_MAP`
      - `exclusivePerType: true` mode: selecting one asset unchecks any other of same type (single-select per type). Used by `KnowledgePanel` for agent chat context
      - Handles stale selections (FE-C5): when SWR revalidates, filter out `selectedIds` that no longer exist in the response
    - Why: `SetupPanel` would exceed 300 lines with inline assets (text + file + asset sections). A shared component avoids code duplication with `KnowledgePanel` (which currently enforces per-type single-select inline at lines 30-33). The `exclusivePerType` prop makes the same component work for both tool setup (per-type config from `assetDef.multiple`) and agent chat (always single-select per type)
    - Dependencies: Step 14 (needs `AssetDef` type)
    - Risk: Medium — new component ~150 lines, must handle loading/empty/error/multi-select states

16. **Wire `selectedAssets` state in `ToolPageLayout`** (File: `apps/frontend/src/components/layout/ToolPageLayout.tsx`)
    - Action:
      - Add `[selectedAssets, setSelectedAssets] = useState<string[]>([])` state
      - Add `[assetDef, setAssetDef] = useState<AssetDef[]>([])` from `fetchToolDefinitions`
      - **FE-C2 fix**: Fetch workspace assets ONCE in ToolPageLayout — not in SetupPanel:
        ```typescript
        const { data: assetsData } = useSWR(`assets-${workspaceId}`, () => api.listAssets(workspaceId));
        const workspaceAssets = assetsData?.assets ?? [];
        ```
        (Note: same SWR key as `AssetList` — cache sharing is intentional and beneficial, no duplicate network requests. Document this in a code comment.)
      - **FE-C3 fix**: Pre-compute `selectedByType: Map<string, number>` with `useMemo`:
        ```typescript
        const selectedByType = useMemo(() => {
          const map = new Map<string, number>();
          for (const id of selectedAssets) {
            const asset = workspaceAssets.find(a => a.id === id);
            if (asset) map.set(asset.assetType, (map.get(asset.assetType) ?? 0) + 1);
          }
          return map;
        }, [selectedAssets, workspaceAssets]);
        ```
      - Extend `requiredMissing` check:
        ```typescript
        const assetMissing = assetDef.some(
          a => a.required && (selectedByType.get(a.assetType) ?? 0) === 0
        );
        const requiredMissing = textMissing || fileMissing || assetMissing;
        ```
      - **FE-C5 fix**: Filter stale `selectedAssets` on SWR revalidate:
        ```typescript
        useEffect(() => {
          const validIds = new Set(workspaceAssets.map(a => a.id));
          setSelectedAssets(prev => prev.filter(id => validIds.has(id)));
        }, [workspaceAssets]);
        ```
      - **FE-C10 fix**: Reset `selectedAssets` on tool change (alongside `setFiles({})` at line 77)
      - Pass `assetDef`, `selectedAssets`, `onAssetChange`, `workspaceAssets`, `selectedByType` to `SetupPanel` and `ReadinessSnapshot`
      - In `handleSubmit`: include `selectedAssets` in the `inputs` object sent to `api.startSession()`
    - Why: ToolPageLayout is the orchestrator — must manage the new state and wire it to children. All asset data flows down from here
    - Dependencies: Steps 14, 15
    - Risk: Medium — touches the main orchestration flow. Must not break existing text/file-only tools (assetDef is empty, all asset code paths are no-ops)

17. **Note: `KnowledgePanel` is dead code** — FE-C8 (File: `apps/frontend/src/components/tool/KnowledgePanel.tsx`)
    - Finding: `KnowledgePanel` has 0 imports anywhere in the frontend. It is dead code.
    - Action: Do NOT modify it (Step 17 in the original plan). When agent chat needs per-type asset selection, use the new `AssetPicker` component with `exclusivePerType={true}` instead
    - Cleanup: File a follow-up task to delete `KnowledgePanel.tsx` as dead code in a separate PR (not this feature)

18. **Add asset readiness to `ReadinessSnapshot`** (File: `apps/frontend/src/components/tool/ReadinessSnapshot.tsx`)
    - Action:
      - Add `assetDef?: AssetDef[]`, `selectedByType?: Map<string, number>`, and `workspaceAssets?: AssetDTO[]` props
      - Add asset readiness rows: for each required asset type, show check/cross with count:
        - `multiple: true` → "✅ Persona: 2 selezionati" or "❌ Persona: 0 selezionati (obbligatorio)"
        - `multiple: false` → "✅ Brief selezionato" or "❌ Brief non selezionato (obbligatorio)"
      - Extend `hasAnyRequired` to include asset requirements
      - Use `selectedByType` map (passed from ToolPageLayout) for O(1) count lookup per type
    - Why: Users need visibility into which assets they still need to select
    - Dependencies: Step 16 (receives `selectedByType` from ToolPageLayout)

19. **Show count in `AssetCoverageBar`** (File: `apps/frontend/src/components/workspace/AssetCoverageBar.tsx`)
    - Action: Change `presentTypes: Set<string>` to count map. Change label from `ASSET_LABELS[type]` to `"Persona (3)"`. If count > 0 show 100% progress + count; if 0 show 0%. Label format `"Persona (3)"` fits within the 100px label width up to 99 assets — adequate for typical B2B team sizes (FE-C7: acceptable)
    - Why: With multiple same-type assets, showing just "present/absent" is misleading. Count gives users useful information
    - Dependencies: None

### Phase 7: Copy Module + DI + Contracts (3 files)

20. **Add copy keys** (File: `packages/copy/src/it/tool-page.ts`)
    - Action: Add keys under `assetPicker` and `readiness` namespaces:
      ```typescript
      assetPicker: {
        title:            'Asset del workspace',
        manageAssets:     'Gestisci asset',
        noAssets:         'Nessun asset di questo tipo',
        noneAvailable:    'Nessun {type} disponibile. Generane uno.',
        generateAsset:    'Genera {type}',
        selectOne:        'Seleziona un {type}',
        selectAtLeastOne: 'Seleziona almeno un {type}',
      },
      ```
      Add readiness keys for asset count display (singular/plural handled by callers):
      ```typescript
      readiness: {
        // ... existing keys ...
        assetsSelected:   '{count} {type} selezionati',
        assetsSelectedOne:'{count} {type} selezionato',
        assetsRequired:   '{count} {type} richiesti (obbligatorio)',
      },
      ```
    - Why: Zero hardcoded strings. FE-C6 identified 6 missing keys — `selectOne`, `selectAtLeastOne`, `noneAvailable` for the picker, `assetsSelected`/`assetsSelectedOne`/`assetsRequired` for readiness
    - Dependencies: Steps 15, 18

21. **Update DI wiring** (File: `apps/backend/src/api/generation.ts`, line 18)
    - Action: Change constructor call to inject `AssetResolver`:
      ```typescript
      const assetResolver = new AssetResolver(workspaceRepo);
      const startSessionUC = new StartSessionUseCase(sessionRepo, assetResolver);
      ```
    - Why: `StartSessionUseCase` now needs `AssetResolver` to resolve assets before readiness check (Step 9). Both `sessionRepo` and `workspaceRepo` are already available in scope. `AssetResolver` wraps `workspaceRepo` cleanly
    - Dependencies: Step 9

22. **Verify `StartSessionRequest` contract** (File: `packages/contracts/src/generation/start-session.dto.ts`)
    - Action: No change needed — `selectedAssets?: string[]` already exists at line 6
    - Why: Contract was forward-designed for this feature

## Test Coverage Plan

Each step in the implementation plan has a corresponding test requirement. The codebase currently has **644 vitest tests** — the baseline must pass after every phase.

### Test Baseline Before Starting

```bash
cd packages/domain && npx vitest run       # domain unit tests
cd apps/backend && npx vitest run          # backend + integration tests
cd apps/frontend && npx vitest run          # frontend component tests
cd packages/infra-db && npx vitest run      # infra repository tests
```

### Test Files by Phase

#### Phase 1 (Domain Foundation)

| Step | Source File | Test File | Action | Tests to Add |
|------|------------|-----------|--------|-------------|
| 1 | `tool-definition.ts` | ❌ Missing | **CREATE** `generation/__tests__/tool-definition.test.ts` | Verify `AssetInput` shape with `multiple: true/false`; verify `ToolDefinition.acquisition.assets` array parsing |
| 2 | `ReadinessPolicy.ts` | ✅ `ReadinessPolicy.test.ts` (137 lines) | **UPDATE** | 4 new: single `resolvedAssets` as `[content]` array, multi as `['c1','c2']`, empty array for missing required, empty Map for all-missing. Fix `makeData()` helper to accept `Map<string, string[]>`
| 3 | `ContextEnricher.ts` | ✅ `ContextEnricher.test.ts` (169 lines) | **UPDATE** | 3 new: multi-asset formatting `[Asset - persona #1]...[Asset - persona #2]`, single asset still works (single-element array), mixed types |

#### Phase 2 (Database)

| 4 | Migration `011` | — | **MANUAL** | Run `SELECT COUNT(*) FROM assets WHERE source_ref IS NULL GROUP BY workspace_id, asset_type HAVING COUNT(*) > 1` before migration; verify constraint after |
| 5 | `KyselyAssetRepository` | ❌ Missing | **CREATE** `infra-db/__tests__/asset-repository.spec.ts` | 6: `findByWorkspaceAndType` returns `Asset[]`, empty array for unknown type, `save()` upsert by new constraint, `save()` insert when new, `delete()`, `findByWorkspace` with multiple same-type assets |

#### Phase 3 (Workspace Domain)

| 6 | `Workspace.ts` | ✅ `Workspace.test.ts` (293 lines) | **NEW tests** | 5: `addAsset()` adds to `_assets`, `getAssetsByType()` returns `Asset[]` for matches, `getAssetsByType()` returns `[]` for no match, `reconstitute()` with `assets` parameter, `getAssetByType()` deprecation wrapper forwards to new method |
| 7 | `AssetResolver.ts` | ❌ Missing | **CREATE** `workspace/__tests__/AssetResolver.test.ts` | 8: resolve required asset from workspace, `MissingRequiredAssetError` when required absent, skip optional absent, `WorkspaceNotFoundError`, empty `acquisition.assets`, `selectedAssetIds` filter, `InvalidAssetSelectionError` for invalid IDs (F1), multi-asset returns `Map<string, string[]>`

#### Phase 4 (Application)

| 8 | `promote-to-asset.usecase.ts` | ❌ Missing | **CREATE** `application/__tests__/promote-to-asset.test.ts` | 8: successful promotion, same artifact twice → same `assetId` (F2), different artifacts same type → different `assetId`s, `ArtifactNotFoundError`, `SessionNotCompletedError`, `ToolNotPromotableError`, `WorkspaceNotFoundError`, `NotAWorkspaceMemberError` |
| 9 | `start-session.usecase.ts` | ✅ `start-session.test.ts` (104 lines) | **UPDATE** | 3 new: `selectedAssets` passed through → `resolvedAssets` populated, no `selectedAssets` → all workspace assets auto-resolved (BA-C4), replay with assets → no new resolution. Update `StartSessionResult` type assertions |

#### Phase 5 (Backend API + Worker)

| 10 | `listTools` in `generation.ts` | ✅ `generation.spec.ts` (306 lines) | **NEW tests** | 1: `listTools` response includes `acquisition.assets[]` with `multiple` field |
| 11 | `startSession` in `generation.ts` | ✅ same file | **UPDATE** | 2: `resolvedAssets` forwarded to worker job, skipped enqueue on `replayed: true` (BA-C5) |
| 12 | `session-worker.ts` | ✅ `session-worker.test.ts` (225 lines) | **UPDATE** | 1: `SessionJobData.resolvedAssets` accepts `Record<string, string[]>` |
| 13 | `error-handler.ts` | ✅ `error-handler.test.ts` (183 lines) | **NEW case** | 1: `ASSET_NOT_FOUND` → 404 (BA-C1) |

#### Phase 6 (Frontend)

| 14 | `fetchToolDefinitions` | ❌ Missing | Covered by SetupPanel test |
| 15 | `AssetPicker.tsx` | ❌ NEW component | **CREATE** `components/__tests__/AssetPicker.test.tsx` | 6: renders radio for `multiple:false`, checkboxes for `multiple:true`, empty state + CTA link, required label, selection callback, `exclusivePerType` single-select enforcement |
| 16 | `ToolPageLayout.tsx` | ❌ Missing | Covered by integration test |
| 17 | `KnowledgePanel.tsx` | — | **No change** (dead code, skip) |
| 18 | `ReadinessSnapshot.tsx` | ❌ Missing | **CREATE** `components/__tests__/ReadinessSnapshot.test.tsx` | 4: shows asset readiness row with count, ✅ for satisfied required, ❌ for unsatisfied required, no row for optional |
| 19 | `AssetCoverageBar.tsx` | ❌ Missing | **UPDATE existing** if any — otherwise manual visual |

#### Phase 7 (Copy + DI)

| 20 | Copy keys | — | **MANUAL** | Verify all 11 new keys resolve via `copy.t()` |
| 21 | DI wiring | — | Covered by `generation.spec.ts` (constructor injected) |
| 22 | Contract | — | **No change** |

### Test Summary

| Category | Count | Details |
|----------|-------|---------|
| **NEW test files** | **6** | `tool-definition`, `asset-repository`, `AssetResolver`, `promote-to-asset`, `AssetPicker`, `ReadinessSnapshot` |
| **EXISTING files — UPDATED** | **5** | `ReadinessPolicy`, `ContextEnricher`, `Workspace`, `start-session`, `session-worker` |
| **EXISTING files — NEW cases in existing** | **2** | `generation.spec.ts` (listTools + startSession), `error-handler.test.ts` (new error code) |
| **MANUAL verification** | **2** | DB migration pre-check, copy key resolution |
| **Estimated new test lines** | **~600** | ~15 tests/avg for new files + ~10 updates to existing |

### Backward Compat Tests (Run After Each Phase)

After every phase, verify these 3 invariants still hold:
1. Existing `brief` tool (no `assets` in acquisition) — `startSession` with text + file → 201
2. Existing single-asset workspace (3 assets, one per type) — `listAssets` → 3 results
3. All 644 existing vitest tests pass with `npx vitest run` across all packages

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
- **BA-C4 test**: `StartSessionUseCase` with tool requiring assets but no `selectedAssets` in request → resolver auto-resolves all workspace assets → readiness passes
- `PromoteToAssetUseCase` — promoting two different personas → two rows in DB
- **F2 test**: `PromoteToAssetUseCase` — promoting same artifact twice → returns same `assetId` both times (idempotency via `sourceArtifactId` match)
- **F2 test**: `PromoteToAssetUseCase` — promoting artifact A then artifact B (same type) → two different `assetId`s, both rows in DB
- **F3 test**: API promote response no longer includes `created` or `promoted` field → verify frontend still works (it never used them)
- **BA-C5 test**: `StartSessionUseCase` returns `replayed: true` → API does NOT enqueue a new worker job
- **BA-C1 test**: Sending `selectedAssets` with non-existent IDs → API returns 404 (not 500)
- **BA-C4 migration test**: Insert two manual assets with same `(workspace_id, type)` and NULL `source_ref` → constraint violation from partial unique index

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