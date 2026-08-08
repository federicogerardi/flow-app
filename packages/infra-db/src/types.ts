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
  accent_color: Generated<string>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date | null, Date>;
  version: Generated<number>;
}

export interface AssetsTable {
  id: string;
  workspace_id: string;
  asset_type: string;
  name: string | null;
  source: string;
  source_ref: string | null;
  content: string;
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

export interface AuthSessionsTable {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: ColumnType<Date, Date, never>;
  created_at: ColumnType<Date, never, never>;
}

export interface OAuthAccountsTable {
  id: string;
  user_id: string;
  provider: string;
  provider_id: string;
  created_at: ColumnType<Date, never, never>;
}

export type TransactionReason = 'generation' | 'admin_grant' | 'purchase' | 'plan_upgrade';

export interface QuotasTable {
  id: string;
  user_id: string;
  period: string;
  plan_type: Generated<string>;
  artifact_limit: number;
  artifact_count: Generated<number>;
  credit_limit: number;
  credit_consumed: Generated<number>;
  created_at: Generated<Date>;
  version: Generated<number>;
}

export interface CreditTransactionsTable {
  id: string;
  quota_id: string;
  amount: number;
  reason: TransactionReason;
  session_id: string | null;
  created_at: Generated<Date>;
}

// ── Gamification tables ──

export interface PlayerProfilesTable {
  user_id: string;
  version: Generated<number>;
  xp_total: Generated<number>;
  current_streak: Generated<number>;
  longest_streak: Generated<number>;
  last_active_date: string | null;
  created_at: Generated<Date>;
  updated_at: ColumnType<Date, Date | null, Date>;
}

export interface AchievementsTable {
  id: Generated<string>;
  user_id: string;
  badge_key: string;
  awarded_at: Generated<Date>;
}

export interface XPTransactionsTable {
  id: Generated<string>;
  user_id: string;
  amount: number;
  source: string;
  source_id: string | null;
  workspace_id: string | null;
  season_id: string;
  created_at: Generated<Date>;
}

export interface GamificationProcessedEventsTable {
  event_id: string;
  processed_at: Generated<Date>;
  expires_at: ColumnType<Date, Date, never>;
}

export interface WorkspaceLeaderboardTable {
  user_id: string;
  workspace_id: string;
  xp: Generated<number>;
  season_id: string;
  updated_at: Generated<Date>;
}

export interface WorkspaceChallengesTable {
  id: Generated<string>;
  workspace_id: string;
  challenge_key: string;
  progress: Generated<number>;
  target: number;
  status: Generated<string>;
  week_start: string;
  created_at: Generated<Date>;
  completed_at: Date | null;
}

export interface ChallengeContributionsTable {
  challenge_id: string;
  user_id: string;
  amount: Generated<number>;
}

export interface DB {
  sessions: SessionsTable;
  artifacts: ArtifactsTable;
  idempotency_keys: IdempotencyKeysTable;
  session_snapshots: SessionSnapshotsTable;
  workspaces: WorkspacesTable;
  assets: AssetsTable;
  workspace_memberships: WorkspaceMembershipsTable;
  users: UsersTable;
  auth_sessions: AuthSessionsTable;
  oauth_accounts: OAuthAccountsTable;
  conversations: ConversationsTable;
  messages: MessagesTable;
  quotas: QuotasTable;
  credit_transactions: CreditTransactionsTable;
  player_profiles: PlayerProfilesTable;
  achievements: AchievementsTable;
  xp_transactions: XPTransactionsTable;
  gamification_processed_events: GamificationProcessedEventsTable;
  workspace_leaderboard: WorkspaceLeaderboardTable;
  workspace_challenges: WorkspaceChallengesTable;
  challenge_contributions: ChallengeContributionsTable;
}
