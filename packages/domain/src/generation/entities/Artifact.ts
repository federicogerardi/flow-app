import { randomUUID } from 'node:crypto';
import type { ArtifactStatus } from '../value-objects/ArtifactStatus';

export class Artifact {
  private _status: ArtifactStatus;

  private constructor(
    readonly artifactId: string,
    readonly sessionId: string,
    readonly stepNumber: number,
    readonly content: string,
    status: ArtifactStatus,
    readonly createdAt: Date,
  ) {
    this._status = status;
  }

  static create(
    sessionId: string,
    stepNumber: number,
    content: string,
  ): Artifact {
    return new Artifact(
      randomUUID(),
      sessionId,
      stepNumber,
      content,
      'completed',
      new Date(),
    );
  }

  static reconstitute(
    artifactId: string,
    sessionId: string,
    stepNumber: number,
    content: string,
    status: ArtifactStatus,
    createdAt: Date,
  ): Artifact {
    return new Artifact(artifactId, sessionId, stepNumber, content, status, createdAt);
  }

  get status(): ArtifactStatus {
    return this._status;
  }
}
