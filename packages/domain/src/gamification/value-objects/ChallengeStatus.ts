export type ChallengeStatusValue = 'active' | 'completed';

export class ChallengeStatus {
  private constructor(private readonly _value: ChallengeStatusValue) {}

  static readonly Active = new ChallengeStatus('active');
  static readonly Completed = new ChallengeStatus('completed');

  static from(value: string): ChallengeStatus {
    if (value === 'active') return ChallengeStatus.Active;
    if (value === 'completed') return ChallengeStatus.Completed;
    return ChallengeStatus.Active; // Default for unknown values (reconstitute safety)
  }

  equals(other: ChallengeStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): ChallengeStatusValue {
    return this._value;
  }

  get isActive(): boolean {
    return this._value === 'active';
  }

  get isCompleted(): boolean {
    return this._value === 'completed';
  }
}
