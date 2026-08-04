import { randomUUID } from '../../shared/random-uuid';
import type { DomainEvent } from '../../shared/domain-event';
import type { ChallengeKey } from '../value-objects/ChallengeKey';
import { ChallengeStatus } from '../value-objects/ChallengeStatus';
import { ChallengeCompleted } from '../domain-events/ChallengeCompleted';

export class WorkspaceChallenge {
  private _version: number;

  private constructor(
    readonly challengeId: string,
    readonly workspaceId: string,
    readonly challengeKey: ChallengeKey,
    private _progress: number,
    readonly target: number,
    private _status: ChallengeStatus,
    readonly weekStart: string,
    readonly createdAt: Date,
    private _completedAt: Date | null,
    version: number,
  ) {
    this._version = version;
  }

  static create(
    workspaceId: string,
    challengeKey: ChallengeKey,
    target: number,
    weekStart: string,
  ): WorkspaceChallenge {
    return new WorkspaceChallenge(
      randomUUID(),
      workspaceId,
      challengeKey,
      0,
      target,
      ChallengeStatus.Active,
      weekStart,
      new Date(),
      null,
      1,
    );
  }

  static reconstitute(
    challengeId: string,
    workspaceId: string,
    challengeKey: ChallengeKey,
    progress: number,
    target: number,
    status: ChallengeStatus,
    weekStart: string,
    createdAt: Date,
    completedAt: Date | null,
    version: number,
  ): WorkspaceChallenge {
    return new WorkspaceChallenge(
      challengeId,
      workspaceId,
      challengeKey,
      progress,
      target,
      status,
      weekStart,
      createdAt,
      completedAt,
      version,
    );
  }

  /** Contribute progress. Returns ChallengeCompleted event if target reached. */
  contribute(amount: number = 1): DomainEvent | null {
    if (!this._status.isActive) return null;

    this._progress = Math.min(this._progress + amount, this.target);
    this._version++;

    if (this._progress >= this.target) {
      this._status = ChallengeStatus.Completed;
      this._completedAt = new Date();
      return new ChallengeCompleted(
        this.challengeId,
        this.challengeId,
        this.workspaceId,
        this.challengeKey.value,
      );
    }

    return null;
  }

  get progress(): number {
    return this._progress;
  }

  get status(): ChallengeStatus {
    return this._status;
  }

  get version(): number {
    return this._version;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }
}
