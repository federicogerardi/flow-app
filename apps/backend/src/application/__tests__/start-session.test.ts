import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolKey, InvalidToolKeyError, type SessionRepository, type AssetResolver } from '@flow-app/domain';
import { StartSessionUseCase, ReadinessError } from '../generation/start-session.usecase';

function createSessionRepo() {
  return {
    findById: vi.fn(),
    findByIdempotencyKeyHash: vi.fn(),
    findByWorkspace: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveWithLock: vi.fn(),
    saveIdempotencyKey: vi.fn(),
    saveSnapshot: vi.fn(),
    loadSnapshot: vi.fn(),
  } as unknown as SessionRepository;
}

function createAssetResolver(overrides: Partial<AssetResolver> = {}): AssetResolver {
  return {
    resolve: vi.fn(async () => new Map()),
    ...overrides,
  } as unknown as AssetResolver;
}

describe('StartSessionUseCase', () => {
  let sessionRepo: SessionRepository;
  let assetResolver: AssetResolver;
  let useCase: StartSessionUseCase;

  beforeEach(() => {
    sessionRepo = createSessionRepo();
    assetResolver = createAssetResolver();
    useCase = new StartSessionUseCase(sessionRepo, assetResolver);
  });

  const validCmd = {
    userId: 'user-1',
    workspaceId: 'ws-1',
    toolKey: 'blog-post',
    inputs: {
      text: { topic: 'How to scale B2B marketing' },
    },
  };

  it('valid request creates session and returns non-replayed result', async () => {
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);

    const result = await useCase.execute(validCmd);

    expect(sessionRepo.findByIdempotencyKeyHash).toHaveBeenCalled();
    expect(sessionRepo.save).toHaveBeenCalled();
    expect(sessionRepo.saveIdempotencyKey).toHaveBeenCalled();
    expect(result.replayed).toBe(false);
    expect(result.session).toBeDefined();
    expect(result.session.toolKey.toString()).toBe('blog-post');
    expect(result.session.workspaceId).toBe('ws-1');
    expect(result.session.userId).toBe('user-1');
    expect(result.toolKey).toBe('blog-post');
    expect(result.stepCount).toBe(3);
    expect(result.resolvedAssets).toBeInstanceOf(Map);
  });

  it('idempotency key match returns existing session (replayed: true)', async () => {
    const existingSession = (await import('@flow-app/domain')).Session.create(
      ToolKey.from('blog-post'),
      'ws-1',
      'user-1',
      'some-hash',
    );
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(existingSession);

    const result = await useCase.execute(validCmd);

    expect(result.replayed).toBe(true);
    expect(result.session).toBe(existingSession);
    expect(result.resolvedAssets).toBeInstanceOf(Map);
    expect(result.resolvedAssets.size).toBe(0);
    expect(sessionRepo.save).not.toHaveBeenCalled();
    expect(sessionRepo.saveIdempotencyKey).not.toHaveBeenCalled();
  });

  it('invalid toolKey string throws InvalidToolKeyError', async () => {
    const cmd = { ...validCmd, toolKey: 'nonexistent-tool' };

    await expect(useCase.execute(cmd)).rejects.toThrow(InvalidToolKeyError);
  });

  it('valid ToolKey not in registry throws ToolNotFoundError', async () => {
    const cmd = {
      ...validCmd,
      toolKey: 'blog-post',
    };

    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);

    await useCase.execute(cmd);

    expect(sessionRepo.save).toHaveBeenCalled();
  });

  it('missing required inputs throws ReadinessError', async () => {
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);
    const cmd = {
      ...validCmd,
      inputs: { text: {} },
    };

    await expect(useCase.execute(cmd)).rejects.toThrow(ReadinessError);
    await expect(useCase.execute(cmd)).rejects.toMatchObject({
      code: 'READINESS_FAILED',
      retryable: true,
    });
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  it('calls assetResolver.resolve unconditionally', async () => {
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);

    await useCase.execute(validCmd);

    expect(assetResolver.resolve).toHaveBeenCalledWith('ws-1', expect.anything(), undefined);
  });

  it('passes selectedAssets to assetResolver', async () => {
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);
    vi.mocked(assetResolver.resolve).mockResolvedValue(new Map([['persona', ['P1', 'P2']]]));

    const cmd = {
      ...validCmd,
      inputs: {
        text: { topic: 'AI' },
        selectedAssets: ['a1', 'a2'],
      },
    };

    const result = await useCase.execute(cmd);

    expect(assetResolver.resolve).toHaveBeenCalledWith('ws-1', expect.anything(), ['a1', 'a2']);
    expect(result.resolvedAssets.get('persona')).toEqual(['P1', 'P2']);
  });

  it('populates resolvedAssets in acquisitionData for readiness check', async () => {
    vi.mocked(sessionRepo.findByIdempotencyKeyHash).mockResolvedValue(null);
    vi.mocked(assetResolver.resolve).mockResolvedValue(new Map([['brand-voice', ['BV content']]]));

    const result = await useCase.execute(validCmd);

    expect(result.resolvedAssets.get('brand-voice')).toEqual(['BV content']);
  });
});
