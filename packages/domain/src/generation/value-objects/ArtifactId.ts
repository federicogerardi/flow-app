import { Identifier } from '../../shared/identifier';
import { randomUUID } from '../../shared/random-uuid';

export class ArtifactId extends Identifier<string> {
  private constructor(value: string) {
    super(value);
  }

  static generate(): ArtifactId {
    return new ArtifactId(randomUUID());
  }

  static from(value: string): ArtifactId {
    return new ArtifactId(value);
  }
}
