export class PromptVersion {
  private constructor(readonly value: string) {}

  static readonly LATEST = new PromptVersion('latest');

  static from(version: string): PromptVersion {
    if (version === 'latest') return PromptVersion.LATEST;
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(`Invalid version: ${version}. Must be semver or "latest".`);
    }
    return new PromptVersion(version);
  }

  get isLatest(): boolean {
    return this.value === 'latest';
  }

  get isPinned(): boolean {
    return !this.isLatest;
  }

  equals(other: PromptVersion): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
