---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Seed Data

> Development seed script for local testing  
> `packages/infra-db/src/seed.ts`

## Principle

Populates the local database with test data for development and demos. Runnable after `docker compose up` and `npm run migrate:up`.

## Usage

```bash
npm run seed --workspace=packages/infra-db
```

## Script

```typescript
// packages/infra-db/src/seed.ts

import bcrypt from 'bcrypt';
import { db } from './connection';

async function seed() {
  console.log('Seeding database...');

  // 1. Users
  const adminHash = await bcrypt.hash('admin123', 12);
  const memberHash = await bcrypt.hash('member123', 12);

  const [admin, member] = await db.insertInto('users')
    .values([
      { email: 'admin@flowapp.dev', password_hash: adminHash, role: 'admin' },
      { email: 'member@flowapp.dev', password_hash: memberHash, role: 'member' },
    ])
    .returning('id')
    .execute();

  console.log(`  ✓ Users: admin (${admin.id}), member (${member.id})`);

  // 2. Workspaces
  const [ws1, ws2] = await db.insertInto('workspaces')
    .values([
      { user_id: admin.id, name: 'Q3 Marketing Campaign' },
      { user_id: member.id, name: 'Product Launch' },
    ])
    .returning('id')
    .execute();

  console.log(`  ✓ Workspaces: ${ws1.id}, ${ws2.id}`);

  // 3. Assets
  await db.insertInto('assets').values([
    { workspace_id: ws1.id, asset_type: 'brand-voice', source: 'manual',
      content: '# Brand Voice\nTono: professionale, autorevole.' },
    { workspace_id: ws1.id, asset_type: 'persona', source: 'manual',
      content: '# Buyer Persona\nMarketing Manager B2B, 35-50 anni.' },
  ]).execute();

  // 4. Quotas
  await db.insertInto('quotas').values([
    { user_id: admin.id,  period: '2026-08', plan_type: 'free',
      artifact_limit: 1000, artifact_count: 0, credit_limit: 250, credit_consumed: 0 },
    { user_id: member.id, period: '2026-08', plan_type: 'free',
      artifact_limit: 1000, artifact_count: 0, credit_limit: 250, credit_consumed: 0 },
  ]).execute();

  // 5. LLM Models
  await db.insertInto('llm_models').values([
    { label: 'Claude Sonnet 4', provider: 'openrouter', model_id: 'anthropic/claude-sonnet-4-20250514', tier: 'premium', sort_order: 1 },
    { label: 'GPT-4o Mini',     provider: 'openrouter', model_id: 'openai/gpt-4o-mini',                tier: 'balanced', sort_order: 2 },
    { label: 'Gemini Flash',    provider: 'openrouter', model_id: 'google/gemini-2.0-flash-lite-001',  tier: 'light', sort_order: 3 },
    { label: 'Gemini Pro',      provider: 'openrouter', model_id: 'google/gemini-2.5-pro-preview-05-06', tier: 'search', sort_order: 4 },
  ]).execute();

  // 6. API Services (requires real keys for actual use)
  await db.insertInto('api_services').values([
    { label: 'SerpAPI', endpoint: 'https://serpapi.com/search', auth_header_name: 'X-API-Key',
      auth_header_value: process.env.SERPAPI_KEY ?? 'demo-key', enabled: !!process.env.SERPAPI_KEY },
  ]).execute();

  console.log('Seed complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
```

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@flowapp.dev` | `admin123` | Admin |
| `member@flowapp.dev` | `member123` | Member |

## Sources

- [[Database Schema]] — table definitions
- [[Docker Compose - Local Dev]] — infrastructure setup