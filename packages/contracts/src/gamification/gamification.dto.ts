export interface PlayerProfileDTO {
  xpTotal: number;
  level: number;
  levelLabel: string;
  levelProgress: number;
  nextLevelXP: number;
  currentStreak: number;
  longestStreak: number;
  badges: { badgeKey: string; awardedAt: string }[];
  season: string;
}

export interface LeaderboardEntryDTO {
  rank: number;
  userId: string;
  xp?: number;
  xpPercent: number;
  isSelf: boolean;
}

export interface WorkspaceHealthDTO {
  score: number;
  label: string;
  color: string;
}

export interface ChallengeDTO {
  id: string;
  key: string;
  progress: number;
  target: number;
  status: string;
  weekStart: string;
  completedAt: string | null;
}

export interface SeasonDTO {
  seasonId: string;
  label: string;
  quarter: number;
  year: number;
  startDate: string;
  endDate: string;
}
