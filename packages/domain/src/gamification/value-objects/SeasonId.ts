import { InvalidSeasonError } from '../errors';

const SEASONS: Array<{ id: string; startMonth: number; endMonth: number; label: string }> = [
  { id: 'Q1', startMonth: 0, endMonth: 2, label: 'Winter Sprint' },
  { id: 'Q2', startMonth: 3, endMonth: 5, label: 'Spring Growth' },
  { id: 'Q3', startMonth: 6, endMonth: 8, label: 'Summer Scale' },
  { id: 'Q4', startMonth: 9, endMonth: 11, label: 'Fall Mastery' },
];

export class SeasonId {
  private constructor(
    private readonly _quarter: string,
    private readonly _year: number,
  ) {}

  static current(date?: Date): SeasonId {
    const now = date ?? new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    for (const season of SEASONS) {
      if (month >= season.startMonth && month <= season.endMonth) {
        return new SeasonId(season.id, year);
      }
    }

    // Fallback for safety
    return new SeasonId('Q1', year);
  }

  static from(value: string): SeasonId {
    // Format: "YYYY-Q1" or "2026-Q3"
    const match = value.match(/^(\d{4})-(Q[1-4])$/);
    if (!match) {
      throw new InvalidSeasonError(value);
    }
    return new SeasonId(match[2], parseInt(match[1], 10));
  }

  static reconstitute(value: string): SeasonId {
    return SeasonId.from(value);
  }

  get value(): string {
    return `${this._year}-${this._quarter}`;
  }

  get label(): string {
    const season = SEASONS.find((s) => s.id === this._quarter);
    return season ? `${season.label} ${this._year}` : this.value;
  }

  get quarter(): string {
    return this._quarter;
  }

  get year(): number {
    return this._year;
  }

  startDate(): Date {
    const season = SEASONS.find((s) => s.id === this._quarter);
    return new Date(Date.UTC(this._year, season?.startMonth ?? 0, 1));
  }

  endDate(): Date {
    const season = SEASONS.find((s) => s.id === this._quarter);
    const endMonth = season?.endMonth ?? 2;
    const lastDay = new Date(Date.UTC(this._year, endMonth + 1, 0));
    return lastDay;
  }

  equals(other: SeasonId): boolean {
    return this._quarter === other._quarter && this._year === other._year;
  }

  toString(): string {
    return this.value;
  }
}
