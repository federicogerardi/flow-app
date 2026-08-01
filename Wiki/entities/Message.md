---
type: entity
tags:
  - wiki/entity
  - wiki/agent-chat
date_updated: 2026-08-01
source_count: 3
---

# Message

> Entity — owned by [[Conversation]] aggregate in [[Agent Chat]] context

## Definition

A `Message` is a single turn in an agent [[Conversation]]. It represents one exchange: a user question, an agent response, or a system instruction. Messages are append-only and immutable once created.

## Ubiquitous Language

- A **user message** is what the user types
- An **agent response** is the AI agent's reply (streamed token-by-token)
- A **system message** is a hidden instruction injected into the context (not shown to the user)

## Structure

```typescript
// packages/domain/src/agent-chat/entities/Message.ts

class Message {
  private constructor(
    readonly messageId: MessageId,
    readonly conversationId: ConversationId,
    readonly role: MessageRole,
    readonly content: string,
    readonly tokensUsed: number | null,       // null for user messages
    readonly modelUsed: string | null,        // null for user messages, e.g. 'anthropic/claude-sonnet-4-20250514'
    readonly createdAt: DateTime,
  ) {}

  static user(conversationId: ConversationId, content: string): Message {
    return new Message(
      MessageId.generate(),
      conversationId,
      MessageRole.User,
      content,
      null,
      null,
      DateTime.now(),
    );
  }

  static agent(
    conversationId: ConversationId,
    content: string,
    tokensUsed: number,
    modelUsed: string,
  ): Message {
    return new Message(
      MessageId.generate(),
      conversationId,
      MessageRole.Agent,
      content,
      tokensUsed,
      modelUsed,
      DateTime.now(),
    );
  }

  static system(conversationId: ConversationId, content: string): Message {
    return new Message(
      MessageId.generate(),
      conversationId,
      MessageRole.System,
      content,
      null,
      null,
      DateTime.now(),
    );
  }
}
```

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `MessageId` | UUID | Unique identifier |
| `MessageRole` | `user` \| `agent` \| `system` | Who sent the message |
| `tokensUsed` | int \| null | LLM tokens consumed (agent messages only) |
| `modelUsed` | string \| null | Which model generated the response (agent messages only) |

## Invariants

- A message belongs to exactly one `[[Conversation]]`
- User messages have `tokensUsed = null` and `modelUsed = null`
- Agent messages must have `tokensUsed > 0` and a valid `modelUsed`
- System messages are not shown in the UI but are part of the context
- Messages are immutable — no edit, no delete

## Database

```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(10)  NOT NULL,          -- user | agent | system
    content         TEXT         NOT NULL,
    tokens_used     INTEGER,                        -- null for user/system messages
    model_used      VARCHAR(100),                   -- null for user/system messages
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at   ON messages(conversation_id, created_at);
```

## Context Window Management

The `[[Conversation]]` exposes `recentMessages(n)` to limit context window size:

```typescript
// When assembling context for the agent:
const recentMessages = conversation.recentMessages(20);

// Older messages are preserved in the database but not sent to the LLM.
// This prevents context window overflow on long conversations.
```

## UI Representation

```
┌─ Chat ──────────────────────────────────────────────────┐
│                                                           │
│  [User] 12:30                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Scrivi un headline per la landing page del        │    │
│  │ prodotto X, targettando CMO di aziende B2B       │    │
│  └──────────────────────────────────────────────────┘    │
│                                                           │
│                              [Copywriter ✍️] 12:30:05    │
│        ┌──────────────────────────────────────────┐      │
│        │ Ecco 3 opzioni di headline:              │      │
│        │                                           │      │
│        │ 1. "Trasforma il tuo marketing B2B..."   │      │
│        │ 2. "Il 78% dei CMO dichiara che..."      │      │
│        │ 3. "Smetti di inseguire lead. Inizia..." │      │
│        │                                           │      │
│        │ Tokens: 247 · Claude Sonnet 4            │      │
│        └──────────────────────────────────────────┘      │
│                                                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │ [Scrivi un messaggio...]                     [→] │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

## Sources

- [[Conversation]] — Parent aggregate root
- [[Agent Chat]] — Parent bounded context
- [[LLM Gateway - OpenRouter]] — Token usage and model tracking
