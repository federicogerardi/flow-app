export class BadgeKey {
  private constructor(private readonly _value: string) {}

  static readonly FirstSession = new BadgeKey('first-session');
  static readonly FirstAsset = new BadgeKey('first-asset');
  static readonly Streak7 = new BadgeKey('streak-7');
  static readonly Tools5 = new BadgeKey('tools-5');
  static readonly Agent10 = new BadgeKey('agent-10');
  static readonly AssetsFull = new BadgeKey('assets-full');
  static readonly TeamJoin = new BadgeKey('team-join');
  static readonly ToolsAll = new BadgeKey('tools-all');
  static readonly AgentsAll = new BadgeKey('agents-all');
  static readonly Streak30 = new BadgeKey('streak-30');
  static readonly Promotions25 = new BadgeKey('promotions-25');
  static readonly TeamSameDay = new BadgeKey('team-same-day');
  static readonly Leaderboard1 = new BadgeKey('leaderboard-1');
  static readonly Sessions100 = new BadgeKey('sessions-100');
  static readonly TotalSessions1000 = new BadgeKey('total-sessions-1000');
  static readonly Health100 = new BadgeKey('health-100');

  static from(value: string): BadgeKey {
    // Allow any badge key string — catalog is open to seasonal additions
    return new BadgeKey(value);
  }

  static reconstitute(value: string): BadgeKey {
    return new BadgeKey(value);
  }

  equals(other: BadgeKey): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  get value(): string {
    return this._value;
  }
}
