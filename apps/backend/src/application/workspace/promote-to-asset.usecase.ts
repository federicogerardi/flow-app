import {
  Asset,
  AssetType,
  AssetSource,
  getTool,
  SessionStatus,
  DomainError,
  NotAWorkspaceMemberError,
  WorkspaceNotFoundError,
  type SessionRepository,
  type WorkspaceRepository,
  type AssetRepository,
} from '@flow-app/domain';

export class ArtifactNotFoundError extends DomainError {
  readonly code = 'ARTIFACT_NOT_FOUND';
  readonly retryable = false;
  constructor(artifactId: string) {
    super(`Artifact ${artifactId} not found in any session`);
  }
}

export class SessionNotCompletedError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(sessionId: string, currentStatus: string) {
    super(`Session ${sessionId} must be completed to promote artifacts. Current: ${currentStatus}`);
  }
}

export class ToolNotPromotableError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(toolKey: string) {
    super(`Tool "${toolKey}" does not produce a promotable asset`);
  }
}

export interface PromoteToAssetCommand {
  userId: string;
  workspaceId: string;
  artifactId: string;
}

export interface PromoteToAssetResult {
  assetId: string;
  assetType: string;
  workspaceId: string;
}

export class PromoteToAssetUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly assetRepo: AssetRepository,
  ) {}

  async execute(cmd: PromoteToAssetCommand): Promise<PromoteToAssetResult> {
    // 1. Find the session that owns this artifact
    const session = await this.sessionRepo.findByArtifactId(cmd.artifactId);
    if (!session) throw new ArtifactNotFoundError(cmd.artifactId);

    // 2. Verify session is completed — only completed sessions have final artifacts
    if (!session.status.equals(SessionStatus.Completed)) {
      throw new SessionNotCompletedError(session.sessionId, session.status.toString());
    }

    // 3. Find the artifact in the session
    const artifact = session.artifacts.find((a) => a.artifactId === cmd.artifactId);
    if (!artifact) throw new ArtifactNotFoundError(cmd.artifactId);

    // 4. Get tool and check if it produces an asset
    const tool = getTool(session.toolKey);
    if (!tool?.produces) {
      throw new ToolNotPromotableError(session.toolKey.value);
    }

    // 5. Validate asset type from tool.produces
    const assetType = AssetType.from(tool.produces);

    // 6. Verify workspace exists and user is member
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(cmd.workspaceId);
    if (!workspace.isMember(cmd.userId)) {
      throw new NotAWorkspaceMemberError(cmd.userId, cmd.workspaceId);
    }

    // 7. Idempotency: check if this exact artifact was already promoted (F2 fix)
    const allAssets = await this.assetRepo.findByWorkspace(cmd.workspaceId);
    const existingMatch = allAssets.find(
      (a) => a.assetType.equals(assetType) && a.sourceArtifactId === cmd.artifactId,
    );

    if (existingMatch) {
      return {
        assetId: existingMatch.assetId,
        assetType: assetType.value,
        workspaceId: cmd.workspaceId,
      };
    }

    // 8. Create new asset — ON CONFLICT (workspace_id, asset_type, source_ref) handles concurrent retries
    const asset = Asset.create({
      workspaceId: cmd.workspaceId,
      assetType,
      source: AssetSource.Generated,
      content: artifact.content,
      sourceSessionId: session.sessionId,
      sourceArtifactId: cmd.artifactId,
    });

    await this.assetRepo.save(asset);

    return {
      assetId: asset.assetId,
      assetType: assetType.value,
      workspaceId: cmd.workspaceId,
    };
  }
}
