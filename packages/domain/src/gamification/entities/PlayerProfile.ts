import type { DomainEvent } from '../../shared/domain-event';
import { Level } from '../value-objects/Level';
import type { BadgeKey } from '../value-objects/BadgeKey';
import type { BadgeTier } from '../value-objects/BadgeTier';
import { Achievement } from './Achievement';
import { XPEarned } from '../domain-events/XPEarned';
import { LevelUp } from '../domain-events/LevelUp';
import { StreakUpdated } from '../domain-events/StreakUpdated';
import { InvalidXPValueError, BadgeAlreadyUnlockedError } from '../errors';

export class PlayerProfile {
  private _achievements: Achievement[];
  private _version: number;

  private constructor(
    readonly userId: string,
    private _xpTotal: number,
    private _currentStreak: number,
    private _longestStreak: number,
    private _lastActiveDate: string | null,
    readonly createdAt: Date,
    private _updatedAt: Date,
    version: number,
    achievements: Achievement[],
  ) {
    this._version = version;
    this._achievements = [...achievements];
  }

  static create(userId: string): PlayerProfile {
    return new PlayerProfile(userId, 0, 0, 0, null, new Date(), new Date(), 1, []);
  }

  static reconstitute(
    userId: string,
    xpTotal: number,
    currentStreak: number,
    longestStreak: number,
    lastActiveDate: string | null,
    createdAt: Date,
    updatedAt: Date,
    version: number,
    achievements: Achievement[],
  ): PlayerProfile {
    return new PlayerProfile(
      userId, xpTotal, currentStreak, longestStreak, lastActiveDate,
      createdAt, updatedAt, version, achievements,
    );
  }

  // ── Business methods ──

  /**
   * Award XP for an action. Checks for level-up.
   * Returns [XPEarned, ...LevelUp?] domain events.
   */
  addXP(amount: number, source: string): DomainEvent[] {
    if (amount <= 0) throw new InvalidXPValueError(amount);

    const oldLevel = this.level.value;
    this._xpTotal += amount;
    this._updatedAt = new Date();
    this._version++;

    const events: DomainEvent[] = [
      new XPEarned(this.userId, this.userId, amount, this._xpTotal, source),
    ];

    const newLevel = this.level.value;
    if (newLevel > oldLevel) {
      events.push(new LevelUp(this.userId, this.userId, oldLevel, newLevel));
    }

    return events;
  }

  /**
   * Record daily activity — updates streak based on UTC calendar date.
   * Returns StreakUpdated or null if already active today.
   */
  recordActivity(todayUTC: string): DomainEvent | null {
    if (this._lastActiveDate === todayUTC) return null;

    const yesterday = this._dayBefore(todayUTC);
    if (this._lastActiveDate === yesterday) {
      this._currentStreak++;
    } else {
      this._currentStreak = 1;
    }

    if (this._currentStreak > this._longestStreak) {
      this._longestStreak = this._currentStreak;
    }

    this._lastActiveDate = todayUTC;
    this._updatedAt = new Date();
    this._version++;

    return new StreakUpdated(this.userId, this.userId, this._currentStreak, this._longestStreak);
  }

  /** Award streak bonus XP at milestones (3, 7, 30 days). Returns events array or empty. */
  getStreakBonus(): DomainEvent[] {
    let bonusXP = 0;
    if (this._currentStreak === 3) bonusXP = 15;
    else if (this._currentStreak === 7) bonusXP = 35;
    else if (this._currentStreak === 30) bonusXP = 150;

    if (bonusXP === 0) return [];
    return this.addXP(bonusXP, 'streak_bonus');
  }

  /** Unlock a badge. Throws BadgeAlreadyUnlockedError if already owned. */
  unlockBadge(badgeKey: BadgeKey, _tier: BadgeTier): Achievement {
    if (this.hasBadge(badgeKey)) {
      throw new BadgeAlreadyUnlockedError(this.userId, badgeKey.value);
    }
    const achievement = Achievement.create(this.userId, badgeKey);
    this._achievements.push(achievement);
    this._updatedAt = new Date();
    this._version++;
    return achievement;
  }

  hasBadge(badgeKey: BadgeKey): boolean {
    return this._achievements.some((a) => a.badgeKey.equals(badgeKey));
  }

  // ── Derived getters ──

  get level(): Level {
    return Level.fromXP(this._xpTotal);
  }

  get badgeCount(): number {
    return this._achievements.length;
  }

  // ── Public getters ──

  get xpTotal(): number {
    return this._xpTotal;
  }

  get currentStreak(): number {
    return this._currentStreak;
  }

  get longestStreak(): number {
    return this._longestStreak;
  }

  get lastActiveDate(): string | null {
    return this._lastActiveDate;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get version(): number {
    return this._version;
  }

  get achievements(): ReadonlyArray<Achievement> {
    return this._achievements;
  }

  // ── Private helpers ──

  private _dayBefore(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
