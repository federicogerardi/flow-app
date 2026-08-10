export type SessionStatusDTO =
  | 'queued'
  | 'draft'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SessionDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: SessionStatusDTO;
  stepCount: number;
  createdAt: string;
}

export interface SessionDetailDTO extends SessionDTO {
  produces?: string;
  currentStepIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  xpEarned?: number;
  artifacts: ArtifactListItemDTO[];
}

export interface SessionListItemDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: SessionStatusDTO;
  stepCount: number;
  currentStepIndex?: number;        // when running
  currentStepLabel?: string;        // when running
  queuePosition?: number;           // when queued
  lastArtifactId?: string;
  lastArtifactPreview?: string;     // first 150 chars
  elapsedSeconds?: number;          // running sessions
  durationSeconds?: number;         // completed sessions
  errorMessage?: string;            // failed sessions
  failedAtStep?: number;            // failed sessions
  isPromotable?: boolean;           // tool.produces !== undefined
  promotedAssetId?: string | null;  // asset UUID if last artifact was promoted, null otherwise
  createdAt: string;
  completedAt?: string | null;
}

export interface ArtifactListItemDTO {
  id: string;
  stepNumber: number;
  stepLabel: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

export interface ArtifactDTO extends ArtifactListItemDTO {
  sessionId: string;
  content: string;
  /** If this artifact has been promoted to an Asset, the Asset's UUID. Null otherwise. */
  promotedAssetId?: string | null;
}
