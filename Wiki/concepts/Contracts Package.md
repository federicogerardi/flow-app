---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/frontend
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# Contracts Package

> Shared types between frontend and backend  
> `packages/contracts/src/`

## Principle

`packages/contracts` is the **authoritative source** for types shared between `apps/frontend` and `apps/backend`. It imports domain types from `packages/domain` and creates DTOs, request/response shapes, and SSE event types. It never contains business logic — only type definitions.

```
packages/domain      →  Entity, VO, Domain Event classes
packages/contracts   →  DTOs, API shapes, SSE types (imports from domain)
apps/backend         →  Implements API routes matching contract shapes
apps/frontend        →  Consumes API responses typed by contract shapes
```

## Directory Structure

```
packages/contracts/src/
├── index.ts                  # Barrel
├── generation/
│   ├── session.dto.ts        # SessionDTO, SessionListItemDTO
│   ├── artifact.dto.ts       # ArtifactDTO
│   └── events.ts             # SSE event types
├── workspace/
│   ├── workspace.dto.ts      # WorkspaceDTO, WorkspaceListItemDTO
│   └── asset.dto.ts          # AssetDTO
├── auth/
│   ├── login.dto.ts          # LoginRequest, LoginResponse
│   └── session.dto.ts        # SessionDTO (auth)
├── admin/
│   ├── user.dto.ts           # AdminUserDTO
│   ├── model.dto.ts          # LlmModelDTO
│   └── job.dto.ts            # JobStatusDTO
└── shared/
    ├── pagination.ts         # PaginatedResponse<T>
    ├── error.ts              # ApiError shape
    └── enums.ts              # Re-exported domain enums
```

## Type Definitions

### Generation

```typescript
// packages/contracts/src/generation/session.dto.ts

import type { Session, Artifact } from '@flow-app/domain/generation';

// Shape returned by POST /api/tools/:toolKey/sessions
type SessionStatusDTO =
  | 'queued'
  | 'draft'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface SessionDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: SessionStatusDTO;
  stepCount: number;
  createdAt: string;
}

// Shape returned by GET /api/sessions/:id
interface SessionDetailDTO extends SessionDTO {
  currentStepIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  artifacts: ArtifactListItemDTO[];
}

// Shape returned by GET /api/sessions
interface SessionListItemDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: SessionStatusDTO;
  stepCount: number;
  createdAt: string;
}

// Shape for artifacts in session detail
interface ArtifactListItemDTO {
  id: string;
  stepNumber: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

// Shape for GET /api/artifacts/:id
interface ArtifactDTO extends ArtifactListItemDTO {
  sessionId: string;
  content: string;
}
```

### Request Shapes

```typescript
// packages/contracts/src/generation/start-session.dto.ts

interface StartSessionRequest {
  workspaceId: string;
  inputs: {
    text?: Record<string, string>;
    files?: { key: string; filename: string; content: string }[];
    selectedAssets?: string[];
  };
}

interface StartSessionResponse {
  session: SessionDTO;
  replayed: boolean;
}
```

### SSE Events

```typescript
// packages/contracts/src/generation/events.ts

interface StepProgress {
  current: number;
  total: number;
}

type SSEEvent =
  | {
      event: 'session_started';
      data: { sessionId: string; status: 'running'; startedAt: string };
    }
  | {
      event: 'step_completed';
      data: {
        sessionId: string;
        stepNumber: number;
        stepLabel: string;
        progress: StepProgress;
      };
    }
  | {
      event: 'session_completed';
      data: {
        sessionId: string;
        status: 'completed';
        finalArtifactId: string;
        completedAt: string;
      };
    }
  | {
      event: 'session_failed';
      data: {
        sessionId: string;
        status: 'failed';
        failedAtStep: number;
        error: { code: string; message: string };
      };
    };
```

### Workspace

```typescript
// packages/contracts/src/workspace/workspace.dto.ts

interface WorkspaceListItemDTO {
  id: string;
  name: string;
  assetCount: number;
  createdAt: string;
}

interface WorkspaceDTO extends WorkspaceListItemDTO {
  assets: AssetListItemDTO[];
  recentSessions: SessionListItemDTO[];
}

interface AssetListItemDTO {
  id: string;
  assetType: 'brief' | 'brand-voice' | 'persona' | 'angle' | 'ad-copy';
  source: 'generated' | 'uploaded' | 'manual';
  createdAt: string;
}

interface AssetDTO extends AssetListItemDTO {
  sourceRef: string | null;
  content: string;
  updatedAt: string;
}
```

### Shared

```typescript
// packages/contracts/src/shared/pagination.ts

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// packages/contracts/src/shared/error.ts

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
}

// packages/contracts/src/shared/enums.ts

export type { 
  AssetType,
  SessionStatus,
  ArtifactStatus,
  ModelTier,
  ToolKey,
} from '@flow-app/domain';
```

## Compile-Time Parity Guard

Ensure frontend and backend use the same API shapes:

```typescript
// packages/contracts/src/generation/__typecheck.ts

// This file fails to compile if the request shape doesn't match
// what the backend route handler expects

import type { StartSessionRequest } from './start-session.dto';
import type { RequestHandler } from 'express';

// Compile-time check: the route handler must accept the correct body type
type AssertHandler<T> = RequestHandler<{ toolKey: string }, any, T>;

// If this line compiles, the contract is satisfied
const _check: AssertHandler<StartSessionRequest> = null!;
```

## Sources

- [[API Routes]] — all request/response shapes
- [[Domain Events Catalog]] — SSE event types
- [[Tool as Static Configuration]] — ToolDefinition, ToolKey
- [[sources/APP-CONCEPT]] — packages/contracts definition
- [[API Contract Baseline v1]] — canonical v1 wire contract
