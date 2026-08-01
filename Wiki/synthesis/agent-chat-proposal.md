---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/agent-chat
  - wiki/architecture
date_updated: 2026-08-01
---

# Agent Chat — Architecture Proposal

> Synthesis of the Agent Chat bounded context design. New Supporting context, zero changes to existing domains.

## Summary

Agent Chat introduces a conversational AI layer to [[Workspace]]s. Seven predefined [[Agent Personas|agents]] embody classic marketing agency roles. Each agent has full access to the workspace's assets, past generation history, and project context. Unlike the deterministic [[Content Generation|tool pipeline]], Agent Chat is open-ended, multi-turn, and stateful. Agents advise and suggest — they do not autonomously execute tools.

## Why a New Bounded Context

| Aspect | Content Generation (Core) | Agent Chat (Supporting, new) |
|--------|--------------------------|------------------------------|
| Interaction | Deterministic pipeline | Conversational, multi-turn |
| State | Session = ephemeral run | Conversation = persistent history |
| Output | Structured Artifact | Streaming text, suggestions |
| Context | Acquisition data | Entire workspace, always available |

Forcing Agent Chat into Content Generation would break the unified tool model.

## What's New

### Domain (`packages/domain/src/agent-chat/`)

```
agent-chat/
├── entities/
│   ├── Conversation.ts                   # Aggregate Root
│   └── Message.ts                        # Entity
├── value-objects/
│   ├── ConversationId.ts
│   ├── MessageId.ts
│   ├── AgentKey.ts
│   ├── ConversationStatus.ts
│   └── MessageRole.ts
├── domain-services/
│   └── AgentContextAssembler.ts           # Assembles InjectionContext for chat
├── domain-events/
│   ├── ConversationStarted.ts
│   ├── MessageAdded.ts
│   └── ConversationArchived.ts
├── agents/
│   ├── agent-definition.ts               # AgentDefinition type + AgentCapability
│   ├── index.ts                          # agentRegistry + getAgent() + listAgents()
│   ├── strategist.agent.ts
│   ├── copywriter.agent.ts
│   ├── seo-specialist.agent.ts
│   ├── ads-specialist.agent.ts
│   ├── analyst.agent.ts
│   ├── creative-director.agent.ts
│   └── email-marketer.agent.ts
├── repositories/
│   └── ConversationRepository.ts
└── index.ts
```

**Total**: ~20 new files. All in `packages/domain`. Zero new infrastructure dependencies.

### Database (`packages/infra-db`)

```sql
-- Migration 008: agent chat
CREATE TABLE conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id       UUID         NOT NULL REFERENCES users(id),
    agent_key     VARCHAR(50)  NOT NULL,
    title         VARCHAR(255),
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(10)  NOT NULL,
    content         TEXT         NOT NULL,
    tokens_used     INTEGER,
    model_used      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### API (`apps/backend`)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/workspaces/:id/agents` | member |
| `POST` | `/api/workspaces/:id/conversations` | editor |
| `GET` | `/api/workspaces/:id/conversations` | member (user-scoped) |
| `GET` | `/api/conversations/:id` | member + owner |
| `POST` | `/api/conversations/:id/messages` | member + owner (SSE) |
| `POST` | `/api/conversations/:id/archive` | member + owner |

### Application (`apps/backend/src/application/agent-chat/`)

| Use Case | Responsibility |
|----------|---------------|
| `StartConversationUseCase` | Create Conversation, inject system message with workspace context |
| `SendMessageUseCase` | Assemble context, compose prompt, stream LLM response via SSE |
| `ArchiveConversationUseCase` | Mark conversation as archived |

## What's Reused

| Component | From | How |
|-----------|------|-----|
| `[[LLM Gateway - OpenRouter]]` | Existing | `generateStream()` for token-by-token SSE |
| `[[PromptComposer]]` | [[synthesis/prompting-mechanics-proposal|Prompting Mechanics]] | Assembles agent system prompt + context |
| `InjectionContext` | [[Context Injection]] | Extended with `conversation` + `history` sources |
| `PromptComponentRegistry` | [[Prompt Components]] | `anti-hallucination/v1`, `marketing-tone/v1`, etc. |
| `requireWorkspaceRole()` | [[Workspace Sharing]] | Editor guard on message sending |
| SSE infrastructure | Existing | Same event stream pattern as session progress |

## Context Assembly Flow

```
User sends message
        │
        ▼
AgentContextAssembler.assemble()
  ├── Load all workspace assets (AssetResolver.resolveAll())
  ├── Load recent sessions + artifacts (SessionRepository.findByWorkspace())
  ├── Load last 20 messages (conversation.recentMessages(20))
  └── Build InjectionContext with all data
        │
        ▼
PromptComposer.compose(agent.systemPrompt, context, agent.defaultComponents)
        │
        ▼
LlmGateway.generateStream(resolved.system, messages + userMessage)
        │
        ▼
SSE → Frontend (token-by-token) → Message persisted
```

## Agent Capabilities

| Capability | Description | Used by |
|-----------|-------------|---------|
| `workspace_context` | Access all workspace assets | All agents |
| `generation_history` | See past sessions and artifacts | All agents |
| `web_search` | Search online | strategist, seo-specialist, analyst |
| `trigger_tool` | Suggest tool execution (advisory) | creative-director |
| `create_asset` | Save output as asset | copywriter, creative-director, email-marketer |

## Credit Consumption

Credits consumed by `Conversation.userId` — same rule as tools. Each agent response deducts credits based on `tokensUsed`. No changes to [[Usage & Quota]].

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **New bounded context** | Conversational ≠ pipeline. Different interaction model, different state, different output |
| **7 agents, static config** | Same pattern as ToolDefinition. Domain-owned, no code per agent |
| **Agents do NOT execute tools** | Keeps contexts decoupled. Agents are advisors, users are executors |
| **20-message context window** | Balances conversation coherence with LLM context limits |
| **No message deletion** | Immutable history for audit and context integrity |
| **Private conversations** | Each user sees only their own conversations — even within shared workspaces. Assets and sessions remain shared. |

## Sources

- [[Agent Chat]] — Feature overview concept page
- [[Agent Personas]] — Agent definitions and catalog
- [[Conversation]] — Aggregate root
- [[Message]] — Entity
- [[Context Injection]] — InjectionContext reused
- [[PromptComposer]] — Prompt assembly reused
- [[LLM Gateway - OpenRouter]] — Streaming LLM calls
- [[Workspace Sharing]] — Permission model for workspace-scoped agents
