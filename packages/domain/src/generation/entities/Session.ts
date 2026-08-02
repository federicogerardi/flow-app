import { randomUUID } from 'node:crypto';
import { SessionStatus } from '../value-objects/SessionStatus';
import type { ToolKey } from '../value-objects/ToolKey';
import { SessionLifecycle, type SessionEventType, type SessionEvent } from '../session-lifecycle';
import type { DomainEvent } from '../../shared/domain-event';
import { DomainError } from '../../shared/domain-error';
import type { Artifact } from './Artifact';

export class Session {
  private _status: SessionStatus;
  private _currentStepIndex: number;
  private _startedAt: Date | null;
  private _completedAt: Date | null;
  private _errorCode: string | null;
  private _errorMessage: string | null;
  private _version: number;
  private _artifacts: Artifact[];

  private constructor(
    readonly sessionId: string,
    readonly toolKey: ToolKey,
    readonly workspaceId: string,
    readonly userId: string,
    readonly idempotencyKeyHash: string,
    status: SessionStatus,
    currentStepIndex: number,
    startedAt: Date | null,
    completedAt: Date | null,
    errorCode: string | null,
    errorMessage: string | null,
    version: number,
    artifacts: Artifact[] = [],
  ) {
    this._status = status;
    this._currentStepIndex = currentStepIndex;
    this._startedAt = startedAt;
    this._completedAt = completedAt;
    this._errorCode = errorCode;
    this._errorMessage = errorMessage;
    this._version = version;
    this._artifacts = artifacts;
  }

  static create(
    toolKey: ToolKey,
    workspaceId: string,
    userId: string,
    idempotencyKeyHash: string,
  ): Session {
    return new Session(
      randomUUID(),
      toolKey,
      workspaceId,
      userId,
      idempotencyKeyHash,
      SessionStatus.Draft,
      0,
      null,
      null,
      null,
      null,
      1,
    );
  }

  static reconstitute(
    sessionId: string,
    toolKey: ToolKey,
    workspaceId: string,
    userId: string,
    idempotencyKeyHash: string,
    status: SessionStatus,
    currentStepIndex: number,
    startedAt: Date | null,
    completedAt: Date | null,
    errorCode: string | null,
    errorMessage: string | null,
    version: number,
    artifacts: Artifact[] = [],
  ): Session {
    return new Session(
      sessionId,
      toolKey,
      workspaceId,
      userId,
      idempotencyKeyHash,
      status,
      currentStepIndex,
      startedAt,
      completedAt,
      errorCode,
      errorMessage,
      version,
      artifacts,
    );
  }

  get status(): SessionStatus {
    return this._status;
  }

  get currentStepIndex(): number {
    return this._currentStepIndex;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get errorCode(): string | null {
    return this._errorCode;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }

  get version(): number {
    return this._version;
  }

  get artifacts(): readonly Artifact[] {
    return this._artifacts;
  }

  apply(event: SessionEvent): DomainEvent | null {
    const nextState = SessionLifecycle.getValidTransition(this._status, event.type);
    if (!nextState) {
      throw new InvalidSessionStateError(this._status, event.type);
    }

    this._status = nextState;
    this._version++;

    switch (event.type) {
      case 'CONFIGURE':
        this._startedAt = new Date();
        return null;

      case 'QUEUE':
        return null;

      case 'WORKER_PICKUP':
        return null;

      case 'ADD_ARTIFACT':
        this._currentStepIndex++;
        this._artifacts.push(event.artifact);
        return null;

      case 'COMPLETE':
        this._completedAt = new Date();
        return {
          eventType: 'SessionCompleted',
          occurredAt: new Date(),
          aggregateId: this.sessionId,
        };

      case 'FAIL':
        this._errorCode = event.errorCode;
        this._errorMessage = event.errorMessage;
        this._completedAt = new Date();
        return {
          eventType: 'SessionFailed',
          occurredAt: new Date(),
          aggregateId: this.sessionId,
        };

      case 'CANCEL':
        this._completedAt = new Date();
        return {
          eventType: 'SessionCancelled',
          occurredAt: new Date(),
          aggregateId: this.sessionId,
        };

      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  }
}

export class InvalidSessionStateError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(
    readonly currentState: SessionStatus,
    readonly attemptedEvent: SessionEventType,
  ) {
    super(`Cannot apply "${attemptedEvent}" in state "${currentState}"`);
  }
}

export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly retryable = false;
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
  }
}
