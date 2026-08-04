import type { Workspace } from '../entities/Workspace';
import type { WorkspaceMembership } from '../entities/WorkspaceMembership';

export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByMember(userId: string): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  saveWithLock(workspace: Workspace, expectedVersion: number): Promise<void>;
  delete(id: string): Promise<void>;
  findMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>;
  findPendingInvitations(userId: string): Promise<Workspace[]>;
}
