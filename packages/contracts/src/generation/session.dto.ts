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
  currentStepIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  artifacts: ArtifactListItemDTO[];
}

export interface SessionListItemDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: SessionStatusDTO;
  stepCount: number;
  createdAt: string;
}

export interface ArtifactListItemDTO {
  id: string;
  stepNumber: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

export interface ArtifactDTO extends ArtifactListItemDTO {
  sessionId: string;
  content: string;
}
