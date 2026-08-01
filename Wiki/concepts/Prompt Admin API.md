---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
  - wiki/admin
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# Prompt Admin API

> REST API for managing prompt templates, versions, and components — `apps/backend/src/routes/admin/prompts.ts`

## Definition

The **Prompt Admin API** provides CRUD operations for [[Prompt Versioning|prompt templates]], their versions, and [[Prompt Components|reusable components]]. It is scoped to the admin role and powers an admin dashboard where prompt engineers can create, edit, publish, and rollback templates without touching the filesystem directly.

## API Routes

All routes prefixed with `/api/admin/prompts`. Require `admin` role (`[[Auth Middleware|requireRole('admin')]]`).

### Templates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/templates` | List all templates across all tools |
| `GET` | `/templates/:toolKey/:stepLabel` | Get template detail + all versions |
| `GET` | `/templates/:toolKey/:stepLabel/versions/:version` | Get template content at a specific version |
| `POST` | `/templates/:toolKey/:stepLabel/versions` | Publish a new version |
| `POST` | `/templates/:toolKey/:stepLabel/preview` | Preview composed prompt with test data |

### Components

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/components` | List all components |
| `GET` | `/components/:componentKey` | Get component detail |
| `POST` | `/components` | Create a new component |
| `PUT` | `/components/:componentKey` | Update component (creates new version) |

### Cache

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cache/invalidate` | Invalidate cache by template or component |
| `GET` | `/cache/stats` | Get [[Prompt Caching Strategy|cache statistics]] |

## Request/Response Shapes

### Publish Template Version

```typescript
// POST /api/admin/prompts/templates/:toolKey/:stepLabel/versions
// Request
{
  "version": "1.3.0",                      // semver, must be > latest
  "changelog": "Added SEO keyword injection slot. Improved CTA instructions.",
  "system": "# system.md content here...",
  "user": "# user.md content with {{slot:*}} placeholders..."
}

// Response 201
{
  "templateId": "landing-funnel/opt-in",
  "version": "1.3.0",
  "previousVersion": "1.2.0",
  "publishedAt": "2026-08-01T14:30:00Z",
  "publishedBy": "admin-user-id",
  "validation": {
    "slotsFound": ["{{slot:file:briefing}}", "{{slot:asset:brand-voice}}", "{{slot:step:1}}"],
    "componentsReferenced": ["anti-hallucination/v1", "output-markdown/v1", "marketing-tone/v1"],
    "warnings": []                          // e.g., "version 1.3.0 is already used by step X"
  }
}

// Response 409 — version already exists
{
  "error": {
    "code": "VERSION_EXISTS",
    "message": "Version 1.3.0 already exists for landing-funnel/opt-in. Latest is 1.2.0."
  }
}
```

### Preview Composed Prompt

```typescript
// POST /api/admin/prompts/templates/:toolKey/:stepLabel/preview
// Request — simulate a real session context
{
  "version": "1.3.0",
  "testContext": {
    "inputs": {
      "keyword": "marketing automation",
      "topic": "Come automatizzare il marketing B2B"
    },
    "assets": {
      "brand-voice": "Tono professionale e diretto. Usare il Lei.",
      "buyer-persona": null                // optional asset — will use defaultValue if set
    },
    "files": {
      "briefing": "Il cliente è una SaaS company che vende soluzioni di..."
    },
    "previousSteps": {
      "step:1": "ANALISI DEL BRIEFING:\nIl target è composto da PMI..."
    },
    "metadata": {
      "workspace.name": "Q3 Campaign 2026"
    }
  },
  "componentKeys": ["anti-hallucination/v1", "output-markdown/v1", "marketing-tone/v1"]
}

// Response 200
{
  "templateId": "landing-funnel/opt-in",
  "version": "1.3.0",
  "resolvedPrompt": {
    "system": "IMPORTANT RULES:\n- Do not fabricate statistics...\n\n---\n\nSei un copywriter...",
    "user": "## Briefing\nIl cliente è una SaaS company...\n\n---\n\nOUTPUT FORMAT:\n..."
  },
  "metadata": {
    "slotsResolved": 4,
    "slotsMissing": [],
    "componentsUsed": ["anti-hallucination/v1", "output-markdown/v1", "marketing-tone/v1"],
    "systemPromptLength": 847,
    "userPromptLength": 3201
  }
}

// Response 422 — validation errors
{
  "error": {
    "code": "SLOT_VALIDATION_FAILED",
    "message": "Missing required slots: [{{slot:asset:brand-voice}}]",
    "missing": ["{{slot:asset:brand-voice}}"]
  }
}
```

### Create Component

```typescript
// POST /api/admin/prompts/components
// Request
{
  "componentKey": "seo-optimized/v1",
  "type": "style_guide",
  "content": "SEO GUIDELINES:\n- Primary keyword in first 100 words...",
  "description": "SEO optimization rules for blog posts and landing pages"
}

// Response 201
{
  "componentKey": "seo-optimized/v1",
  "type": "style_guide",
  "version": "1.0.0",
  "createdAt": "2026-08-01T14:30:00Z"
}
```

## Domain Events

The admin API publishes domain events that feed into caching and monitoring:

```typescript
// Published by POST /templates/:toolKey/:stepLabel/versions
class PromptTemplatePublished {
  constructor(
    readonly templateId: PromptTemplateId,
    readonly version: PromptVersion,
    readonly previousVersion: PromptVersion | null,
    readonly publishedBy: string,
    readonly publishedAt: DateTime,
  ) {}
}

// Published by PUT /components/:componentKey (future)
class PromptComponentPublished {
  constructor(
    readonly componentKey: string,
    readonly version: PromptVersion,
    readonly publishedBy: string,
    readonly publishedAt: DateTime,
  ) {}
}
```

## Validation Rules

The API enforces these rules before persisting:

| Rule | Check | Error |
|------|-------|-------|
| Version monotonicity | New version > current latest | `VERSION_MUST_INCREASE` |
| Version immutability | Cannot overwrite existing version | `VERSION_EXISTS` |
| Slot syntax | All `{{slot:*}}` use known sources (`input`, `asset`, `file`, `step`, `data`, `meta`) | `INVALID_SLOT_SOURCE` |
| Component existence | All referenced component keys exist in registry | `COMPONENT_NOT_FOUND` |
| Non-empty content | Both `system` and `user` are non-empty strings | `EMPTY_TEMPLATE` |
| Valid Markdown | (optional lint) Template content is valid Markdown | `MARKDOWN_LINT_WARNING` |

## Implementation — Write-Through to Filesystem

The admin API writes directly to the filesystem. No database — the filesystem IS the source of truth:

```typescript
// apps/backend/src/routes/admin/prompts.ts

router.post('/templates/:toolKey/:stepLabel/versions', requireRole('admin'), async (req, res) => {
  const { toolKey, stepLabel } = req.params;
  const { version, changelog, system, user } = req.body;

  const templateId = PromptTemplateId.from(toolKey, stepLabel);
  const promptVersion = PromptVersion.from(version);

  // 1. Validate version > latest
  const versions = await promptRepo.listVersions(templateId);
  const latest = versions[versions.length - 1];
  if (latest && compareVersions(promptVersion, latest) <= 0) {
    return res.status(409).json({
      error: { code: 'VERSION_MUST_INCREASE', message: `New version must be > ${latest.value}` }
    });
  }

  // 2. Validate slots
  const schema = InjectionSchema.from(system + user);
  // (report warnings for unknown sources but don't block)

  // 3. Write to filesystem
  const versionDir = resolveTemplatePath(templateId, promptVersion);
  await fs.mkdir(versionDir, { recursive: true });
  await fs.writeFile(`${versionDir}/system.md`, system);
  await fs.writeFile(`${versionDir}/user.md`, user);

  // 4. Write changelog
  await fs.writeFile(`${versionDir}/CHANGELOG.md`, changelog);

  // 5. Update latest symlink
  const latestLink = resolveTemplatePath(templateId, PromptVersion.LATEST);
  await fs.unlink(latestLink).catch(() => {}); // ignore if doesn't exist
  await fs.symlink(versionDir, latestLink);

  // 6. Publish domain event → cache invalidation
  const event = new PromptTemplatePublished(
    templateId, promptVersion, latest,
    req.user!.id, DateTime.now(),
  );
  eventBus.publish(event);

  // 7. Reload component registry if components directory changed
  // (handled by file watcher or manual reload endpoint)

  res.status(201).json({
    templateId: templateId.toString(),
    version: promptVersion.value,
    previousVersion: latest?.value ?? null,
    publishedAt: DateTime.now().toISO(),
    publishedBy: req.user!.id,
    validation: {
      slotsFound: schema.slots.map(s => `{{slot:${s.source}:${s.key}}}`),
      componentsReferenced: extractComponentRefs(system + user),
      warnings: [],
    },
  });
});
```

## Admin UI Integration

The admin dashboard renders:

```
┌─ Prompt Admin ─────────────────────────────────────────────┐
│                                                              │
│ Templates                          Components               │
│ ┌─────────────────────────────┐   ┌──────────────────────┐ │
│ │ landing-funnel              │   │ anti-hallucination/v1 │ │
│ │   extraction    v1.0.0      │   │ output-markdown/v1   │ │
│ │   opt-in        v1.2.0  ←──│───│ marketing-tone/v1    │ │
│ │   quiz          v1.0.0      │   │ seo-optimized/v1     │ │
│ │   vsl           v1.0.0      │   └──────────────────────┘ │
│ │ blog-post                   │                              │
│ │   ...                       │   [New Component]            │
│ └─────────────────────────────┘                              │
│                                                              │
│ Template Detail: landing-funnel/opt-in                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Versions: 1.0.0 | 1.1.0 | 1.2.0 (latest)                │ │
│ │                                                           │ │
│ │ [Preview with test data]  [Publish new version]           │ │
│ │                                                           │ │
│ │ System Prompt:               User Prompt:                 │ │
│ │ ┌──────────────────────┐    ┌──────────────────────────┐ │ │
│ │ │ IMPORTANT RULES:     │    │ ## Briefing              │ │ │
│ │ │ - Do not fabricate.. │    │ {{slot:file:briefing}}   │ │ │
│ │ │                      │    │ ## Brand Voice           │ │ │
│ │ │ ---                  │    │ {{slot:asset:brand-voice}}│ │ │
│ │ │ Sei un copywriter... │    │ ...                      │ │ │
│ │ └──────────────────────┘    └──────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Key Properties

| Property | Meaning |
|----------|---------|
| **Filesystem as source of truth** | No new DB tables. Git tracks all changes |
| **Semantic versioning** | `MAJOR.MINOR.PATCH` — MAJOR = breaking output change |
| **Preview endpoint** | Test a template with synthetic context before publishing |
| **Domain events on publish** | `PromptTemplatePublished` → cache invalidation, audit log |
| **Write-through** | API writes to filesystem synchronously — no cache staleness |
| **Admin-only** | All routes behind `requireRole('admin')` middleware |

## Sources

- [[Prompt Versioning]] — Templates and versions managed by this API
- [[Prompt Components]] — Components managed by this API
- [[PromptComposer]] — Preview endpoint uses the composer with test data
- [[Prompt Caching Strategy]] — Cache invalidated on publish
- [[Auth Middleware]] — Admin role enforcement