import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Session,
  ToolKey,
  Workspace,
  Asset,
  AssetType,
  AssetSource,
  SessionStatus,
  Artifact,
  ArtifactStatus,
  MembershipRole,
  MembershipStatus,
  WorkspaceMembership,
  NotAWorkspaceMemberError,
  WorkspaceNotFoundError,
  type SessionRepository,
  type WorkspaceRepository,
  type AssetRepository,
} from '@flow-app/domain';
import {
  PromoteToAssetUseCase,
  ArtifactNotFoundError,
  SessionNotCompletedError,
  ToolNotPromotableError,
} from '../workspace/promote-to-asset.usecase';

function createSessionRepo(overrides: Partial<SessionRepository> = {}): SessionRepository {
  return {
    findById: vi.fn(),
    findByIdempotencyKeyHash: vi.fn(),
    findByWorkspace: vi.fn(),
    findByArtifactId: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveWithLock: vi.fn(),
    saveIdempotencyKey: vi.fn(),
    saveSnapshot: vi.fn(),
    loadSnapshot: vi.fn(),
    ...overrides,
  } as unknown as SessionRepository;
}

function createWorkspaceRepo(overrides: Partial<WorkspaceRepository> = {}): WorkspaceRepository {
  return {
    findById: vi.fn(),
    findByUser: vi.fn(),
    save: vi.fn(),
    ...overrides,
  } as unknown as WorkspaceRepository;
}

function createAssetRepo(overrides: Partial<AssetRepository> = {}): AssetRepository {
  return {
    findByWorkspace: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    findByWorkspaceAndType: vi.fn(async () => []),
    save: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    ...overrides,
  } as unknown as AssetRepository;
}

function makeCompletedSession() {
  const artifact = Artifact.reconstitute(
    'art-1',
    'sess-1',
    1,
    'Final artifact content',
    ArtifactStatus.Completed,
    new Date(),
  );
  return Session.reconstitute(
    'sess-1',
    ToolKey.from('brief'),
    'ws-1',
    'user-1',
    'hash-1',
    SessionStatus.Completed,
    1,
    new Date(),
    new Date(),
    null,
    null,
    1,
    [artifact],
    new Date(),
  );
}

function makeWorkspace() {
  const now = new Date();
  const ownerMembership = WorkspaceMembership.reconstitute(
    'user-1', 'ws-1', MembershipRole.Owner, MembershipStatus.Active, 'user-1', now, now,
  );
  return Workspace.reconstitute('ws-1', 'user-1', 'Test WS', '#2563eb', now, now, 1, [ownerMembership]);
}

describe('PromoteToAssetUseCase', () => {
  let sessionRepo: SessionRepository;
  let workspaceRepo: WorkspaceRepository;
  let assetRepo: AssetRepository;
  let useCase: PromoteToAssetUseCase;

  beforeEach(() => {
    sessionRepo = createSessionRepo();
    workspaceRepo = createWorkspaceRepo();
    assetRepo = createAssetRepo();
    useCase = new PromoteToAssetUseCase(sessionRepo, workspaceRepo, assetRepo);
  });

  const validCmd = {
    userId: 'user-1',
    workspaceId: 'ws-1',
    artifactId: 'art-1',
  };

  it('should promote artifact to asset successfully', async () => {
    const session = makeCompletedSession();
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(makeWorkspace());

    const result = await useCase.execute(validCmd);

    expect(result.assetType).toBe('brief');
    expect(result.workspaceId).toBe('ws-1');
    expect(result.assetId).toBeDefined();
    expect(assetRepo.save).toHaveBeenCalled();
  });

  it('should return existing asset idempotently when same artifact promoted twice (F2)', async () => {
    const session = makeCompletedSession();
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(makeWorkspace());

    const existingAsset = Asset.reconstitute(
      'existing-asset-1',
      'ws-1',
      AssetType.from('brief'),
      AssetSource.Generated,
      'content',
      null,
      'art-1',
      null,
      new Date(),
      new Date(),
    );
    vi.mocked(assetRepo.findByWorkspace).mockResolvedValue([existingAsset]);

    const result = await useCase.execute(validCmd);

    expect(result.assetId).toBe('existing-asset-1');
    expect(assetRepo.save).not.toHaveBeenCalled();
  });

  it('should throw ArtifactNotFoundError when session not found', async () => {
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(null);

    await expect(useCase.execute(validCmd)).rejects.toThrow(ArtifactNotFoundError);
  });

  it('should throw SessionNotCompletedError when session is not completed', async () => {
    const session = Session.create(ToolKey.from('blog-post'), 'ws-1', 'user-1', 'hash-1');
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);

    await expect(useCase.execute(validCmd)).rejects.toThrow(SessionNotCompletedError);
  });

  it('should throw ToolNotPromotableError when tool has no produces', async () => {
    const artifact = Artifact.reconstitute('art-1', 'sess-1', 1, 'content', ArtifactStatus.Completed, new Date());
    const session = Session.reconstitute(
      'sess-1', ToolKey.from('blog-post'), 'ws-1', 'user-1', 'hash-1',
      SessionStatus.Completed, 1, new Date(), new Date(), null, null, 1, [artifact],
      new Date(),
    );
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);

    await expect(useCase.execute(validCmd)).rejects.toThrow(ToolNotPromotableError);
  });

  it('should throw WorkspaceNotFoundError when workspace not found', async () => {
    const session = makeCompletedSession();
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validCmd)).rejects.toThrow(WorkspaceNotFoundError);
  });

  it('should throw NotAWorkspaceMemberError when user is not member', async () => {
    const session = makeCompletedSession();
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);
    const workspace = makeWorkspace();
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace);

    await expect(
      useCase.execute({ ...validCmd, userId: 'outsider-1' }),
    ).rejects.toThrow(NotAWorkspaceMemberError);
  });

  it('should save new asset when no existing match found', async () => {
    const session = makeCompletedSession();
    vi.mocked(sessionRepo.findByArtifactId).mockResolvedValue(session);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(makeWorkspace());
    vi.mocked(assetRepo.findByWorkspace).mockResolvedValue([]);

    await useCase.execute(validCmd);

    expect(assetRepo.save).toHaveBeenCalled();
    const savedAsset = vi.mocked(assetRepo.save).mock.calls[0][0];
    expect(savedAsset.assetType.value).toBe('brief');
  });
});
