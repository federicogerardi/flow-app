import { DomainError } from '../shared/domain-error';

export class QuotaExceededError extends DomainError {
  readonly code = 'QUOTA_EXCEEDED';
  readonly retryable = false;
  constructor(limit: number, attempted: number) {
    super(`Credit quota exceeded: limit ${limit}, attempted ${attempted}`);
  }
}

export class ArtifactGateExceededError extends DomainError {
  readonly code = 'ARTIFACT_GATE_EXCEEDED';
  readonly retryable = false;
  constructor(limit: number, current: number) {
    super(`Artifact gate exceeded: limit ${limit}, current ${current}`);
  }
}

export class QuotaNotFoundError extends DomainError {
  readonly code = 'QUOTA_NOT_FOUND';
  readonly retryable = false;
  constructor(userId: string, period: string) {
    super(`Quota not found for user ${userId} in period ${period}`);
  }
}
