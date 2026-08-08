import { createHash } from 'node:crypto';
import {
  Session,
  getTool,
  ReadinessPolicy,
  ToolKey,
  type SessionRepository,
  type AcquisitionData,
  type AssetResolver,
  DomainError,
} from '@flow-app/domain';

export class ReadinessError extends DomainError {
  readonly code = 'READINESS_FAILED';
  readonly retryable = true;
  constructor(missing: Array<{ type: string; key: string; label: string }>) {
    super(`Missing required inputs: ${missing.map((m) => m.label).join(', ')}`, { missing });
  }
}

export class ToolNotFoundError extends DomainError {
  readonly code = 'TOOL_NOT_FOUND';
  readonly retryable = false;
  constructor(toolKey: string) {
    super(`Tool "${toolKey}" not found`);
  }
}

export interface StartSessionCommand {
  userId: string;
  workspaceId: string;
  toolKey: string;
  inputs: {
    text?: Record<string, string>;
    files?: { key: string; content: string }[];
    selectedAssets?: string[];
  };
}

export interface StartSessionResult {
  session: Session;
  toolKey: string;
  stepCount: number;
  replayed: boolean;
  resolvedAssets: Map<string, string[]>;
}

export class StartSessionUseCase {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly assetResolver: AssetResolver,
  ) {}

  async execute(cmd: StartSessionCommand): Promise<StartSessionResult> {
    const idempotencyHash = this.computeHash(cmd.userId, cmd.workspaceId, cmd.toolKey, cmd.inputs);

    const tool = getTool(ToolKey.from(cmd.toolKey));
    if (!tool) throw new ToolNotFoundError(cmd.toolKey);

    // Resolve assets unconditionally — needed for both fresh and replayed sessions
    const resolvedAssets = await this.assetResolver.resolve(
      cmd.workspaceId,
      tool,
      cmd.inputs.selectedAssets,
    );

    // Check for existing session (idempotency)
    const existing = await this.sessionRepo.findByIdempotencyKeyHash(idempotencyHash);
    if (existing) {
      // If the existing session is cancelled or failed, delete the stale
      // idempotency key and create a fresh session. The user wants to retry
      // with the same inputs — blocking them on a dead session is frustrating.
      if (existing.status.toString() === 'cancelled' || existing.status.toString() === 'failed') {
        await this.sessionRepo.deleteIdempotencyKey(idempotencyHash);
        // Fall through to fresh session creation below
      } else {
        return {
          session: existing,
          toolKey: existing.toolKey.value,
          stepCount: getTool(existing.toolKey)?.steps.length ?? 0,
          replayed: true,
          resolvedAssets,
        };
      }
    }

    // Fresh session: validate readiness and create
    const acquisitionData: AcquisitionData = {
      userInputs: cmd.inputs.text ?? {},
      fileContents: Object.fromEntries(
        (cmd.inputs.files ?? []).map((f) => [f.key, f.content]),
      ),
      apiResponses: [],
      resolvedAssets,
    };

    const policy = ReadinessPolicy.from(tool);
    const readiness = policy.evaluate(acquisitionData);
    if (!readiness.isReady) throw new ReadinessError(readiness.missing);

    const session = Session.create(
      ToolKey.from(cmd.toolKey),
      cmd.workspaceId,
      cmd.userId,
      idempotencyHash,
    );

    session.apply({ type: 'CONFIGURE' });

    await this.sessionRepo.save(session);
    await this.sessionRepo.saveIdempotencyKey(idempotencyHash, session.sessionId);

    return {
      session,
      toolKey: cmd.toolKey,
      stepCount: tool.steps.length,
      replayed: false,
      resolvedAssets,
    };
  }

  private computeHash(userId: string, workspaceId: string, toolKey: string, inputs: unknown): string {
    const content = JSON.stringify({ userId, workspaceId, toolKey, inputs });
    return createHash('sha256').update(content).digest('hex');
  }
}
