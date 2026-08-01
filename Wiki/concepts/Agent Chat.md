---
type: concept
tags:
  - wiki/concept
  - wiki/agent-chat
  - wiki/workspace
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Agent Chat

> New Supporting Bounded Context — conversational AI agents with workspace context. `packages/domain/src/agent-chat/`

## Definition

**Agent Chat** is a conversational interface where users interact with AI agents embodying classic marketing agency roles. Each agent has deep access to the [[Workspace]]'s assets, past generation history, and project context. Unlike the deterministic [[Content Generation|tool pipeline]], Agent Chat is open-ended, multi-turn, and stateful. Agents are consultants, not executors — they advise and suggest, but the user controls execution.

## Motivation

Current state: [[Content Generation]] is powerful but transactional. The user submits inputs → gets output. There is no way to have a conversation about strategy, ask "why" questions, iterate on ideas, or get creative direction before committing to a generation. Agent Chat fills this gap by providing a marketing team in the workspace.

## Why a New Bounded Context

| Aspect | [[Content Generation]] (existing) | Agent Chat (new) |
|--------|----------------------------------|------------------|
| **Interaction** | Deterministic pipeline | Conversational, multi-turn |
| **State** | Session = ephemeral pipeline run | Conversation = persistent history |
| **Output** | Structured artifact per step | Streaming text, suggestions |
| **Context** | Acquisition data per session | Entire workspace, always available |
| **Trigger** | User submits tool | User sends message |
| **Execution model** | BullMQ worker, step-by-step | Synchronous LLM call with streaming |

Forcing Agent Chat into Content Generation would break the unified tool model. It is a separate Supporting bounded context.

## Aggregate Root

**[[Conversation]]** — a chat session between a [[User]] and an [[Agent Personas|agent persona]] within a [[Workspace]].

## Entities

| Entity | Role |
|--------|------|
| [[Conversation]] | Aggregate Root — the chat session |
| [[Message]] | A single message in the conversation (user, agent, or system) |

## Agent Catalog

Seven agents, each modeled on a classic marketing agency role:

| Agent Key | Role | Essence |
|-----------|------|---------|
| `strategist` | Marketing Strategist | Campaign planning, objectives, competitor analysis |
| `copywriter` | Senior Copywriter | Persuasive copy, headlines, CTAs, landing pages |
| `seo-specialist` | SEO Specialist | Keyword analysis, content optimization, structure |
| `ads-specialist` | Ads Specialist | Ad copy, CTR optimization, A/B testing ideas |
| `analyst` | Data Analyst | Data interpretation, reports, trend identification |
| `creative-director` | Creative Director | Creative direction, tone of voice, brand coherence |
| `email-marketer` | Email Marketer | Email sequences, nurture flows, subject lines |

See [[Agent Personas]] for full definitions.

## Context Assembly

Every agent message is enriched with the full workspace context:

```
AgentContext.assemble()
├── All workspace assets (brand voice, persona, brief, angle)
├── Recent generation sessions + their artifacts
├── Last 20 messages of conversation history
└── Metadata (workspace name, agent name, date)
```

This uses the same `[[Context Injection|InjectionContext]]` VO from the prompting mechanics, extended with `conversation` and `history` sources.

## Conversation Privacy

Conversations are **private to their creator**. Within a shared workspace:

| Resource | Visibility |
|----------|-----------|
| [[Asset]]s | Shared — all members see the same assets |
| Tool [[Session]]s | Shared — all members see all sessions |
| **Agent [[Conversation]]s** | **Private — each user sees only their own** |

This means two members of the same workspace can each have independent conversations with the same agent. User A's chat history with the Copywriter is never visible to User B. Both agents see the same shared assets and sessions — but their conversations are isolated.

Enforced at two layers:
- **Domain**: `Conversation.userId` is immutable. No method exposes another user's conversation.
- **API**: `GET /api/conversations/:id` requires both workspace membership AND `conversation.userId === req.user.sub`

Each agent has a set of declared capabilities:

| Capability | Description |
|-----------|-------------|
| `workspace_context` | Access all workspace assets |
| `generation_history` | See past sessions and artifacts |
| `web_search` | Search online (if model supports it) |
| `trigger_tool` | Suggest tool execution (advisory only) |
| `create_asset` | Save agent output as an asset |

Agents do **not** autonomously trigger tools — they advise, the user decides. This keeps the bounded contexts decoupled.

## Flow

```
User selects agent → opens conversation → sends message
        │
        ▼
AgentContext.assemble(workspaceId, history, agent)
        │
        ▼
PromptComposer.compose(agent.systemPrompt, context, components)
        │
        ▼
LlmGateway.generateStream() → SSE → token-by-token to frontend
        │
        ▼
Message persisted in conversation history
```

## Credit Consumption

Same rule as tools: credits consumed by `Conversation.userId`. Each agent response deducts credits based on tokens used. See [[Usage & Quota]].

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/workspaces/:id/agents` | member | List available agents |
| `POST` | `/api/workspaces/:id/conversations` | editor | Start new conversation |
| `GET` | `/api/workspaces/:id/conversations` | member | List conversations |
| `GET` | `/api/conversations/:id` | member + owner | Get conversation + messages (must be owner) |
| `POST` | `/api/conversations/:id/messages` | member + owner | Send message — SSE response (must be owner) |
| `POST` | `/api/conversations/:id/archive` | member + owner | Archive conversation (must be owner) |

## Cross-Context Interactions

| Direction | Context | Pattern | Description |
|-----------|---------|---------|-------------|
| Reads | [[Workspace & Assets]] | Sync | `AssetResolver.resolveAll()` for context |
| Reads | [[Content Generation]] | Sync | Recent sessions + artifacts for context |
| Reads | [[Workspace Sharing]] | Sync | `requireWorkspaceRole('editor')` for message sending |
| → | [[Usage & Quota]] | Async | Credit consumption on agent response |

Agent Chat **never writes** to Workspace or Generation. It is a read-only consumer of their data.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Separate bounded context** | Conversational ≠ pipeline. No changes to Content Generation |
| **7 agents, static config** | Same pattern as ToolDefinition — agents are config, not code |
| **Full workspace context** | Every agent sees all assets, history, and project data |
| **Streaming responses** | SSE token-by-token, same infrastructure as session progress |
| **Advisory only** | Agents suggest, users decide. No autonomous tool execution |
| **Private conversations** | Each user sees only their own conversations. Assets and sessions remain shared. |

## Sources

- [[Agent Personas]] — Agent definitions and catalog
- [[Conversation]] — Aggregate root
- [[Message]] — Entity
- [[Context Injection]] — InjectionContext extended for chat
- [[PromptComposer]] — Assembly of agent system prompt + context
- [[LLM Gateway - OpenRouter]] — Streaming LLM calls
- [[Workspace Sharing]] — Permission model for workspace-scoped agents
