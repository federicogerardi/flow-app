import { randomUUID } from '../../shared/random-uuid';
import type { BadgeKey } from '../value-objects/BadgeKey';

export class Achievement {
  private constructor(
    readonly achievementId: string,
    readonly userId: string,
    readonly badgeKey: BadgeKey,
    readonly awardedAt: Date,
  ) {}

  static create(userId: string, badgeKey: BadgeKey): Achievement {
    return new Achievement(randomUUID(), userId, badgeKey, new Date());
  }

  static reconstitute(id: string, userId: string, badgeKey: BadgeKey, awardedAt: Date): Achievement {
    return new Achievement(id, userId, badgeKey, awardedAt);
  }
}
