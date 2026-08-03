export class Streak {
  private constructor(private readonly _days: number) {}

  static of(days: number): Streak {
    if (days < 0 || !Number.isInteger(days)) {
      return Streak.Zero;
    }
    return new Streak(days);
  }

  static readonly Zero = new Streak(0);

  static reconstitute(days: number): Streak {
    return new Streak(days);
  }

  increment(): Streak {
    return new Streak(this._days + 1);
  }

  equals(other: Streak): boolean {
    return this._days === other._days;
  }

  get value(): number {
    return this._days;
  }

  get days(): number {
    return this._days;
  }
}
