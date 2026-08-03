import { SeasonId } from '../value-objects/SeasonId';

/**
 * Pure function — season logic (Q1 = Jan-Mar, etc.).
 * Zero I/O, zero infrastructure imports.
 */
export class SeasonService {
  /** Returns the current season based on the provided date (defaults to now). */
  static current(date?: Date): SeasonId {
    return SeasonId.current(date);
  }

  /** Checks if a badge's seasonal constraint matches the current season. */
  static isActive(badgeSeasonal: SeasonId, now?: Date): boolean {
    const current = SeasonId.current(now);
    // Seasonal badges match on quarter only (year-agnostic for recurring seasons)
    return badgeSeasonal.quarter === current.quarter;
  }
}
