import { InvalidChallengeKeyError } from '../errors';

export class ChallengeKey {
  private constructor(private readonly _value: string) {}

  static readonly ContentSprint = new ChallengeKey('content-sprint');
  static readonly AssetBuilder = new ChallengeKey('asset-builder');
  static readonly AiDialogue = new ChallengeKey('ai-dialogue');
  static readonly FullCoverage = new ChallengeKey('full-coverage');
  static readonly PowerWeek = new ChallengeKey('power-week');

  static from(value: string): ChallengeKey {
    switch (value) {
      case 'content-sprint': return ChallengeKey.ContentSprint;
      case 'asset-builder': return ChallengeKey.AssetBuilder;
      case 'ai-dialogue': return ChallengeKey.AiDialogue;
      case 'full-coverage': return ChallengeKey.FullCoverage;
      case 'power-week': return ChallengeKey.PowerWeek;
      default: throw new InvalidChallengeKeyError(value);
    }
  }

  static reconstitute(value: string): ChallengeKey {
    return new ChallengeKey(value);
  }

  equals(other: ChallengeKey): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): string {
    return this._value;
  }
}
