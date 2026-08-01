export class ArtifactContent {
  private constructor(readonly value: string) {}

  static from(value: string): ArtifactContent {
    return new ArtifactContent(value);
  }

  toString(): string {
    return this.value;
  }
}
