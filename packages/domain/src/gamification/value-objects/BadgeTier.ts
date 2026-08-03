import { InvalidBadgeTierError } from '../errors';

export type BadgeTierValue = 'common' | 'rare' | 'epic' | 'legendary';

export class BadgeTier {
  private constructor(
    private readonly _value: BadgeTierValue,
    private readonly _creditReward: number,
  ) {}

  static readonly Common = new BadgeTier('common', 10);
  static readonly Rare = new BadgeTier('rare', 25);
  static readonly Epic = new BadgeTier('epic', 50);
  static readonly Legendary = new BadgeTier('legendary', 100);

  static from(value: string): BadgeTier {
    switch (value) {
      case 'common': return BadgeTier.Common;
      case 'rare': return BadgeTier.Rare;
      case 'epic': return BadgeTier.Epic;
      case 'legendary': return BadgeTier.Legendary;
      default: throw new InvalidBadgeTierError(value);
    }
  }

  equals(other: BadgeTier): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): BadgeTierValue {
    return this._value;
  }

  get creditReward(): number {
    return this._creditReward;
  }
}
