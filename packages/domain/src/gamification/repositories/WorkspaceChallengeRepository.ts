import type { WorkspaceChallenge } from '../entities/WorkspaceChallenge';
import type { ChallengeKey } from '../value-objects/ChallengeKey';
import type { ChallengeStatus } from '../value-objects/ChallengeStatus';

export interface WorkspaceChallengeRepository {
  findActiveForWorkspace(workspaceId: string, weekStart: string): Promise<WorkspaceChallenge[]>;
  findOrCreate(
    workspaceId: string,
    challengeKey: ChallengeKey,
    target: number,
    weekStart: string,
  ): Promise<WorkspaceChallenge>;
  save(challenge: WorkspaceChallenge): Promise<void>;
  findAllForWorkspace(
    workspaceId: string,
    filters?: { status?: ChallengeStatus },
  ): Promise<WorkspaceChallenge[]>;
}
