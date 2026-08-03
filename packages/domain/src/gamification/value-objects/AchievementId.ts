import { randomUUID } from 'node:crypto';

export class AchievementId {
  private constructor(private readonly _value: string) {}

  static generate(): AchievementId {
    return new AchievementId(randomUUID());
  }

  static from(id: string): AchievementId {
    return new AchievementId(id);
  }

  equals(other: AchievementId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): string {
    return this._value;
  }
}
