import { describe, it, expect } from 'vitest';
import { Artifact } from '../entities/Artifact';
import { ArtifactStatus } from '../value-objects/ArtifactStatus';

describe('Artifact', () => {
  describe('create', () => {
    it('should set status to Completed', () => {
      const artifact = Artifact.create('session-1', 1, 'content');
      expect(artifact.status).toBe(ArtifactStatus.Completed);
    });

    it('should store stepNumber', () => {
      const artifact = Artifact.create('session-1', 3, 'content');
      expect(artifact.stepNumber).toBe(3);
    });

    it('should store content', () => {
      const artifact = Artifact.create('session-1', 1, 'some content');
      expect(artifact.content).toBe('some content');
    });

    it('should store sessionId', () => {
      const artifact = Artifact.create('session-abc', 1, 'content');
      expect(artifact.sessionId).toBe('session-abc');
    });

    it('should generate an artifactId', () => {
      const artifact = Artifact.create('session-1', 1, 'content');
      expect(artifact.artifactId).toBeTruthy();
      expect(typeof artifact.artifactId).toBe('string');
    });

    it('should set createdAt to a Date', () => {
      const artifact = Artifact.create('session-1', 1, 'content');
      expect(artifact.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const createdAt = new Date('2025-01-01');
      const artifact = Artifact.reconstitute(
        'art-1',
        'session-1',
        5,
        'reconstituted content',
        ArtifactStatus.Failed,
        createdAt,
      );

      expect(artifact.artifactId).toBe('art-1');
      expect(artifact.sessionId).toBe('session-1');
      expect(artifact.stepNumber).toBe(5);
      expect(artifact.content).toBe('reconstituted content');
      expect(artifact.status).toBe(ArtifactStatus.Failed);
      expect(artifact.createdAt).toBe(createdAt);
    });
  });

  describe('status getter', () => {
    it('should return the ArtifactStatus', () => {
      const artifact = Artifact.reconstitute(
        'art-1',
        'session-1',
        1,
        'content',
        ArtifactStatus.Pending,
        new Date(),
      );
      expect(artifact.status).toBe(ArtifactStatus.Pending);
    });
  });
});
