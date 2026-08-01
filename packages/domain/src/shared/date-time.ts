export class DateTime {
  private constructor(private readonly date: Date) {}

  static now(): DateTime {
    return new DateTime(new Date());
  }

  static from(date: Date): DateTime {
    return new DateTime(new Date(date.getTime()));
  }

  static fromISO(iso: string): DateTime {
    return new DateTime(new Date(iso));
  }

  toDate(): Date {
    return new Date(this.date.getTime());
  }

  toISOString(): string {
    return this.date.toISOString();
  }

  isBefore(other: DateTime): boolean {
    return this.date < other.date;
  }

  isAfter(other: DateTime): boolean {
    return this.date > other.date;
  }

  equals(other: DateTime): boolean {
    return this.date.getTime() === other.date.getTime();
  }
}
