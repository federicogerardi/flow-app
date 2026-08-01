---
type: entity
tags:
  - wiki/entity
  - wiki/agent-chat
date_updated: 2026-08-01
source_count: 4
---

# Conversation

> Aggregate Root — [[Agent Chat]] context

## Definition

A `Conversation` is a **private** chat session between a [[User]] and an [[Agent Personas|agent]] within a [[Workspace]]. It contains an ordered history of [[Message]]s and persists across user sessions. Each conversation is scoped to one agent and one user — switching agents or users starts a new conversation. Conversations are never shared between users, even within the same workspace.

## Ubiquitous Language

- A user **starts** a conversation with an agent
- A user **sends a message** → the agent **responds**
- A conversation can be **archived** (not deleted — preserved for history)
- Each conversation has one **agent persona** (the agent does not change mid-conversation)

## Lifecycle

```
active ──archive()──▶ archived
```

| State | Meaning | Transition |
|-------|---------|------------|
| `active` | Conversation is ongoing. User can send messages. | → `archived` on `archive()` |
| `archived` | Conversation is closed. Read-only. | Terminal |

There is no `delete` — conversations are preserved for audit and context reference.

## Structure

```typescript
// packages/domain/src/agent-chat/entities/Conversation.ts

class Conversation {
  private _messages: Message[];
  private _status: ConversationStatus;
  private _title: string | null;

  private constructor(
    readonly conversationId: ConversationId,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
    readonly agentKey: AgentKey,
    readonly createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {
    this._messages = [];
    this._status = ConversationStatus.Active;
    this._title = null;
  }

  static start(
    workspaceId: WorkspaceId,
    userId: UserId,
    agentKey: AgentKey,
  ): Conversation {
    return new Conversation(
      ConversationId.generate(),
      workspaceId,
      userId,
      agentKey,
      DateTime.now(),
      DateTime.now(),
    );
  }

  /** Add a message to the conversation */
  addMessage(message: Message): void {
    if (this._status !== ConversationStatus.Active) {
      throw new ConversationArchivedError(this.conversationId);
    }
    this._messages.push(message);
    this._updatedAt = DateTime.now();

    // Auto-title from first user message
    if (!this._title && message.role === MessageRole.User) {
      this._title = message.content.slice(0, 80) + (message.content.length > 80 ? '...' : '');
    }
  }

  /** Archive the conversation */
  archive(): void {
    if (this._status !== ConversationStatus.Active) {
      throw new ConversationAlreadyArchivedError(this.conversationId);
    }
    this._status = ConversationStatus.Archived;
    this._updatedAt = DateTime.now();
  }

  get status(): ConversationStatus { return this._status; }
  get messages(): ReadonlyArray<Message> { return this._messages; }
  get title(): string | null { return this._title; }
  get updatedAt(): DateTime { return this._updatedAt; }

  /** Last N messages for context window management */
  recentMessages(n: number = 20): Message[] {
    return this._messages.slice(-n);
  }
}
```

## Invariants

- A conversation belongs to exactly one `[[Workspace]]` (`workspaceId`)
- A conversation is **private to its creator** (`userId`) — no other user can read or modify it
- A conversation has exactly one `AgentKey` — cannot change mid-conversation
- Messages are append-only — never modified or deleted
- An archived conversation cannot receive new messages

## Internal Entities

- **[[Message]]** (1:N) — Ordered messages in the conversation

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `ConversationId` | UUID | Unique identifier |
| `AgentKey` | string | References an `[[Agent Personas|AgentDefinition]]` |
| `ConversationStatus` | `active` \| `archived` | Lifecycle state |

## Domain Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `ConversationStarted` | `Conversation.start()` | conversationId, workspaceId, userId, agentKey |
| `MessageAdded` | `addMessage()` | conversationId, messageId, role, tokenCount |
| `ConversationArchived` | `archive()` | conversationId, userId |

## Repository

```typescript
// packages/domain/src/agent-chat/repositories/ConversationRepository.ts

interface ConversationRepository {
  findById(id: ConversationId): Promise<Conversation | null>;
  findByUserAndWorkspace(userId: UserId, workspaceId: WorkspaceId, options?: Pagination): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}
```

> **Privacy rule**: `findByUserAndWorkspace()` replaces the previous `findByWorkspace()`. Conversations are always scoped to the requesting user. No query returns another user's conversations. The database index `idx_conversations_user` supports this query pattern.

## Database

```sql
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

CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_user      ON conversations(user_id);
CREATE INDEX idx_conversations_status    ON conversations(status);
```

## Sources

- [[Agent Chat]] — Parent bounded context
- [[Agent Personas]] — Agent definitions referenced by `agentKey`
- [[Message]] — Internal entity
- [[Workspace Sharing]] — Permission model for workspace-scoped conversations