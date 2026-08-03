import type { Kysely } from 'kysely';
import type { DB } from '../types';
import type { WorkspaceChallengeRepository } from '@flow-app/domain';
import { WorkspaceChallenge, ChallengeKey, ChallengeStatus } from '@flow-app/domain';

export class KyselyWorkspaceChallengeRepository implements WorkspaceChallengeRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findActiveForWorkspace(workspaceId: string, weekStart: string): Promise<WorkspaceChallenge[]> {
    const rows = await this.db
      .selectFrom('workspace_challenges')
      .where('workspace_id', '=', workspaceId)
      .where('week_start', '=', weekStart)
      .where('status', '=', 'active')
      .selectAll()
      .execute();

    return rows.map((r) =>
      WorkspaceChallenge.reconstitute(
        r.id,
        r.workspace_id,
        ChallengeKey.reconstitute(r.challenge_key),
        r.progress,
        r.target,
        ChallengeStatus.from(r.status),
        r.week_start,
        r.created_at ?? new Date(),
        r.completed_at,
        1, // workspace_challenges table has no version column — single-writer access
      ),
    );
  }

  async findOrCreate(
    workspaceId: string,
    challengeKey: ChallengeKey,
    target: number,
    weekStart: string,
  ): Promise<WorkspaceChallenge> {
    const existing = await this.findActiveForWorkspace(workspaceId, weekStart);

    const match = existing.find((c) => c.challengeKey.equals(challengeKey));
    if (match) return match;

    const challenge = WorkspaceChallenge.create(workspaceId, challengeKey, target, weekStart);
    await this.save(challenge);
    return challenge;
  }

  async save(challenge: WorkspaceChallenge): Promise<void> {
    const status = challenge.status.value;

    await this.db
      .insertInto('workspace_challenges')
      .values({
        id: challenge.challengeId,
        workspace_id: challenge.workspaceId,
        challenge_key: challenge.challengeKey.value,
        progress: challenge.progress,
        target: challenge.target,
        status,
        week_start: challenge.weekStart,
        completed_at: challenge.completedAt,
      })
      .onConflict((oc) =>
        oc.columns(['workspace_id', 'challenge_key', 'week_start']).doUpdateSet({
          progress: challenge.progress,
          target: challenge.target,
          status,
          completed_at: challenge.completedAt,
        }),
      )
      .execute();
  }

  async findAllForWorkspace(
    workspaceId: string,
    filters?: { status?: ChallengeStatus },
  ): Promise<WorkspaceChallenge[]> {
    let query = this.db
      .selectFrom('workspace_challenges')
      .where('workspace_id', '=', workspaceId)
      .selectAll()
      .orderBy('week_start', 'desc');

    if (filters?.status) {
      query = query.where('status', '=', filters.status.value);
    }

    const rows = await query.execute();

    return rows.map((r) =>
      WorkspaceChallenge.reconstitute(
        r.id,
        r.workspace_id,
        ChallengeKey.reconstitute(r.challenge_key),
        r.progress,
        r.target,
        ChallengeStatus.from(r.status),
        r.week_start,
        r.created_at ?? new Date(),
        r.completed_at,
        1,
      ),
    );
  }
}
