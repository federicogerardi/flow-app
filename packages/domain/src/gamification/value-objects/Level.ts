const THRESHOLDS = [0, 200, 500, 1000, 2500, 5000, 10000];

export class Level {
  private constructor(private readonly _value: number) {}

  static fromXP(xpTotal: number): Level {
    let level = 1;
    for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
      if (xpTotal >= THRESHOLDS[i]) {
        level = i + 1;
        break;
      }
    }
    return new Level(level);
  }

  static reconstitute(value: number): Level {
    return new Level(value);
  }

  get value(): number {
    return this._value;
  }

  get label(): string {
    const labels = ['Novice', 'Explorer', 'Practitioner', 'Specialist', 'Expert', 'Master', 'Guru'];
    return labels[this._value - 1] ?? 'Unknown';
  }

  /** XP required to reach this level */
  thresholdXP(): number {
    return THRESHOLDS[this._value - 1] ?? 0;
  }

  /** XP required to reach next level, or Infinity if at max */
  nextThresholdXP(): number {
    if (this._value >= THRESHOLDS.length) return Infinity;
    return THRESHOLDS[this._value] ?? Infinity;
  }

  /** Progress percentage (0-100) toward next level */
  progressToNext(xpTotal: number): number {
    const currentThreshold = this.thresholdXP();
    const nextThreshold = this.nextThresholdXP();
    if (!isFinite(nextThreshold)) return 100;
    return ((xpTotal - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  }

  equals(other: Level): boolean {
    return this._value === other._value;
  }
}
