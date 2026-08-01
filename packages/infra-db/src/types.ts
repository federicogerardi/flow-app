import type { Generated, ColumnType } from 'kysely';

export type SessionStatus = 'queued' | 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ArtifactStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface SessionsTable {
  id: string;
  tool_key: string;
  workspace_id: string;
  user_id: string;
  idempotency_key_hash: string;
  status: Generated<SessionStatus>;
  current_step_index: Generated<number>;
  started_at: ColumnType<Date | null, Date | null, Date | null>;
  completed_at: ColumnType<Date | null, Date | null, Date | null>;
  error_code: string | null;
  error_message: string | null;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
  version: Generated<number>;
}

export interface ArtifactsTable {
  id: string;
  session_id: string;
  step_number: number;
  content: string;
  status: Generated<ArtifactStatus>;
  created_at: ColumnType<Date, never, never>;
}

export interface IdempotencyKeysTable {
  key_hash: string;
  session_id: string;
  created_at: ColumnType<Date, never, never>;
  expires_at: ColumnType<Date, Date, never>;
}

export interface SessionSnapshotsTable {
  id: Generated<string>;
  session_id: string;
  snapshot: unknown;
  created_at: ColumnType<Date, never, never>;
}

export interface WorkspacesTable {
  id: string;
  created_by: string;
  name: string;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
  version: Generated<number>;
}

export interface WorkspaceMembershipsTable {
  workspace_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by: string | null;
  invited_at: ColumnType<Date | null, Date | null, Date | null>;
  joined_at: ColumnType<Date | null, Date | null, Date | null>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
}

export interface UsersTable {
  id: string;
  email: string;
  password_hash: string | null;
  role: Generated<string>;
  status: Generated<string>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
}

export interface ConversationsTable {
  id: string;
  workspace_id: string;
  user_id: string;
  agent_key: string;
  title: string | null;
  status: Generated<string>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
}

export interface MessagesTable {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tokens_used: number | null;
  model_used: string | null;
  created_at: ColumnType<Date, never, never>;
}

export interface DB {
  sessions: SessionsTable;
  artifacts: ArtifactsTable;
  idempotency_keys: IdempotencyKeysTable;
  session_snapshots: SessionSnapshotsTable;
  workspaces: WorkspacesTable;
  workspace_memberships: WorkspaceMembershipsTable;
  users: UsersTable;
  conversations: ConversationsTable;
  messages: MessagesTable;
}
