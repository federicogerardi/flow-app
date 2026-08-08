import type { Kysely } from 'kysely';
import type { DB } from '../types';
import { Workspace, WorkspaceMembership, ConcurrencyError, MembershipRole, MembershipStatus, Asset, AssetType, AssetSource, type WorkspaceRepository } from '@flow-app/domain';

export class KyselyWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Kysely<DB>) {}

  private async syncMemberships(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executor: Kysely<DB> | any,
    workspaceId: string,
    memberships: readonly WorkspaceMembership[],
  ): Promise<void> {
    if (memberships.length === 0) return;

    await Promise.all(memberships.map(m =>
      executor
        .insertInto('workspace_memberships')
        .values({
          workspace_id: workspaceId,
          user_id: m.userId,
          role: m.role.value,
          status: m.status.value,
          invited_by: m.invitedBy,
          invited_at: m.invitedAt,
          joined_at: m.joinedAt,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .onConflict((oc: any) =>
          oc.columns(['workspace_id', 'user_id']).doUpdateSet({
            role: m.role.value,
            status: m.status.value,
            joined_at: m.joinedAt,
            updated_at: new Date(),
          }),
        )
        .execute(),
    ));
  }

  async findById(id: string): Promise<Workspace | null> {
    const workspace = await this.db
      .selectFrom('workspaces')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!workspace) return null;

    const memberships = await this.db
      .selectFrom('workspace_memberships')
      .where('workspace_id', '=', id)
      .selectAll()
      .execute();

    const assetRows = await this.db
      .selectFrom('assets')
      .where('workspace_id', '=', id)
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    const assets = assetRows.map((r) =>
      Asset.reconstitute(
        r.id,
        r.workspace_id,
        AssetType.from(r.asset_type),
        AssetSource.from(r.source),
        r.content,
        r.source_ref,
        null,
        r.name ?? null,
        r.created_at,
        r.updated_at,
      ),
    );

    return Workspace.reconstitute(
      workspace.id,
      workspace.created_by,
      workspace.name,
      workspace.accent_color ?? '#2563eb',
      workspace.created_at,
      workspace.updated_at,
      workspace.version,
      memberships.map((m) =>
        WorkspaceMembership.reconstitute(
          m.user_id,
          m.workspace_id,
          MembershipRole.from(m.role),
          MembershipStatus.from(m.status),
          m.invited_by ?? '',
          m.invited_at ?? new Date(),
          m.joined_at,
        ),
      ),
      assets,
    );
  }

  async findByMember(userId: string): Promise<Workspace[]> {
    const rows = await this.db
      .selectFrom('workspace_memberships')
      .innerJoin('workspaces', 'workspaces.id', 'workspace_memberships.workspace_id')
      .where('workspace_memberships.user_id', '=', userId)
      .where('workspace_memberships.status', '=', 'active')
      .selectAll('workspaces')
      .execute();

    if (rows.length === 0) return [];

    const workspaceIds = rows.map(r => r.id);

    const allMemberships = await this.db
      .selectFrom('workspace_memberships')
      .where('workspace_id', 'in', workspaceIds)
      .where('status', '=', 'active')
      .selectAll()
      .execute();

    const membershipMap = new Map<string, typeof allMemberships>();
    for (const m of allMemberships) {
      const list = membershipMap.get(m.workspace_id) ?? [];
      list.push(m);
      membershipMap.set(m.workspace_id, list);
    }

    return rows.map(row => {
      const memberships = membershipMap.get(row.id) ?? [];
      return Workspace.reconstitute(
        row.id,
        row.created_by,
        row.name,
        row.accent_color ?? '#2563eb',
        row.created_at,
        row.updated_at,
        row.version,
        memberships.map(m =>
          WorkspaceMembership.reconstitute(
            m.user_id,
            m.workspace_id,
            MembershipRole.from(m.role),
            MembershipStatus.from(m.status),
            m.invited_by ?? '',
            m.invited_at ?? new Date(),
            m.joined_at,
          ),
        ),
      );
    });
  }

  async save(workspace: Workspace): Promise<void> {
    await this.db
      .insertInto('workspaces')
      .values({
        id: workspace.workspaceId,
        created_by: workspace.createdBy,
        name: workspace.name,
        accent_color: workspace.accentColor,
        version: workspace.version,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          name: workspace.name,
          accent_color: workspace.accentColor,
          version: workspace.version,
          updated_at: new Date(),
        }),
      )
      .execute();

    await this.syncMemberships(this.db, workspace.workspaceId, workspace.memberships);
  }

  async saveWithLock(workspace: Workspace, expectedVersion: number): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('workspaces')
        .set({
          name: workspace.name,
          accent_color: workspace.accentColor,
          version: workspace.version,
          updated_at: new Date(),
        })
        .where('id', '=', workspace.workspaceId)
        .where('version', '=', expectedVersion)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        const current = await trx
          .selectFrom('workspaces')
          .where('id', '=', workspace.workspaceId)
          .select('version')
          .executeTakeFirst();

        throw new ConcurrencyError(
          workspace.workspaceId,
          expectedVersion,
          current?.version ?? -1,
        );
      }

      await this.syncMemberships(trx, workspace.workspaceId, workspace.memberships);
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom('workspace_memberships').where('workspace_id', '=', id).execute();
      await trx.deleteFrom('assets').where('workspace_id', '=', id).execute();
      await trx.deleteFrom('workspace_leaderboard').where('workspace_id', '=', id).execute();
      await trx.deleteFrom('workspace_challenges').where('workspace_id', '=', id).execute();
      await trx.deleteFrom('workspaces').where('id', '=', id).execute();
    });
  }

  async findMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null> {
    const row = await this.db
      .selectFrom('workspace_memberships')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    return WorkspaceMembership.reconstitute(
      row.user_id,
      row.workspace_id,
      MembershipRole.from(row.role),
      MembershipStatus.from(row.status),
      row.invited_by ?? '',
      row.invited_at ?? new Date(),
      row.joined_at,
    );
  }

  async findPendingInvitations(userId: string): Promise<Workspace[]> {
    const rows = await this.db
      .selectFrom('workspace_memberships')
      .innerJoin('workspaces', 'workspaces.id', 'workspace_memberships.workspace_id')
      .where('workspace_memberships.user_id', '=', userId)
      .where('workspace_memberships.status', '=', 'invited')
      .selectAll('workspaces')
      .execute();

    if (rows.length === 0) return [];

    const workspaceIds = rows.map(r => r.id);

    const allMemberships = await this.db
      .selectFrom('workspace_memberships')
      .where('workspace_id', 'in', workspaceIds)
      .selectAll()
      .execute();

    const membershipMap = new Map<string, typeof allMemberships>();
    for (const m of allMemberships) {
      const list = membershipMap.get(m.workspace_id) ?? [];
      list.push(m);
      membershipMap.set(m.workspace_id, list);
    }

    return rows.map(row => {
      const memberships = membershipMap.get(row.id) ?? [];
      return Workspace.reconstitute(
        row.id,
        row.created_by,
        row.name,
        row.accent_color ?? '#2563eb',
        row.created_at,
        row.updated_at,
        row.version,
        memberships.map(m =>
          WorkspaceMembership.reconstitute(
            m.user_id,
            m.workspace_id,
            MembershipRole.from(m.role),
            MembershipStatus.from(m.status),
            m.invited_by ?? '',
            m.invited_at ?? new Date(),
            m.joined_at,
          ),
        ),
      );
    });
  }
}
