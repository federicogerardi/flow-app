import { Router } from 'express';
import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';
import type { PlayerProfileRepository, WorkspaceChallengeRepository, WorkspaceRepository } from '@flow-app/domain';
import { SeasonId, MembershipRole } from '@flow-app/domain';
import { LeaderboardProjectionRepository } from '../../infrastructure/leaderboard-projection-repository';
import { GetPlayerProfileUseCase } from '../../application/gamification/get-player-profile.usecase';
import { authenticate } from '../../middleware/authenticate';
import type { TokenService } from '../../infrastructure/token-service';
import { requireWorkspaceRole } from '../../middleware/workspace-role';

export function createGamificationRoutes(
  db: Kysely<DB>,
  playerProfileRepo: PlayerProfileRepository,
  workspaceChallengeRepo: WorkspaceChallengeRepository,
  workspaceRepo: WorkspaceRepository,
  tokenService: TokenService,
): Router {
  const router = Router();
  const leaderboardRepo = new LeaderboardProjectionRepository(db);
  const getPlayerProfile = new GetPlayerProfileUseCase(playerProfileRepo);

  const auth = authenticate(tokenService);
  const workspaceMember = requireWorkspaceRole(
    workspaceRepo,
    MembershipRole.Owner,
    MembershipRole.Editor,
    MembershipRole.Viewer,
  );

  // GET /api/me/profile — player's XP, level, streak, badges
  router.get('/api/me/profile', auth, async (req, res) => {
    try {
      const userId = req.user!.sub as string;
      if (!userId) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      }

      const profile = await getPlayerProfile.execute(userId);
      if (!profile) {
        return res.json({
          xpTotal: 0,
          level: 1,
          levelLabel: 'Novice',
          currentStreak: 0,
          longestStreak: 0,
          badges: [],
          season: SeasonId.current().value,
        });
      }

      return res.json({
        xpTotal: profile.xpTotal,
        level: profile.level.value,
        levelLabel: profile.level.label,
        levelProgress: profile.level.progressToNext(profile.xpTotal),
        nextLevelXP: profile.level.nextThresholdXP(),
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        badges: profile.achievements.map((a) => ({
          badgeKey: a.badgeKey.value,
          awardedAt: a.awardedAt.toISOString(),
        })),
        season: SeasonId.current().value,
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } });
    }
  });

  // GET /api/workspaces/:id/leaderboard — ranked leaderboard (current season)
  router.get(
    '/api/workspaces/:id/leaderboard',
    auth,
    workspaceMember,
    async (req, res) => {
      try {
        const workspaceId = req.params.id as string;
        const userId = req.user!.sub as string;
        const seasonId = SeasonId.current().value;

        const entries = await leaderboardRepo.getLeaderboard(workspaceId, seasonId);

        const leaderboard = entries.map((entry, index) => {
          const isSelf = entry.userId === userId;
          const xpPercent = entries[0] && entries[0].xp > 0
            ? Math.round((entry.xp / entries[0].xp) * 100)
            : 0;

          return {
            rank: index + 1,
            userId: entry.userId,
            // XP is private — only expose for self
            xp: isSelf ? entry.xp : undefined,
            xpPercent,
            isSelf,
          };
        });

        return res.json({ leaderboard, season: seasonId });
      } catch {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch leaderboard' } });
      }
    },
  );

  // GET /api/workspaces/:id/health — workspace health score
  router.get(
    '/api/workspaces/:id/health',
    auth,
    workspaceMember,
    async (_req, res) => {
      try {
        // Health score is computed on-read from existing data
        // Stub: return basic health snapshot
        return res.json({
          score: 50,
          components: {
            assetCoverage: 30,
            sessionSuccessRate: 25,
            promotionRate: 20,
            teamActivity: 15,
            agentEngagement: 10,
          },
          label: 'Needs Attention',
          color: 'yellow',
        });
      } catch {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch health' } });
      }
    },
  );

  // GET /api/workspaces/:id/challenges — active + past weekly challenges
  router.get(
    '/api/workspaces/:id/challenges',
    auth,
    workspaceMember,
    async (req, res) => {
      try {
        const workspaceId = req.params.id as string;
        const challenges = await workspaceChallengeRepo.findAllForWorkspace(workspaceId);

        return res.json({
          challenges: challenges.map((c) => ({
            id: c.challengeId,
            key: c.challengeKey.value,
            progress: c.progress,
            target: c.target,
            status: c.status.value,
            weekStart: c.weekStart,
            completedAt: c.completedAt?.toISOString() ?? null,
          })),
        });
      } catch {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch challenges' } });
      }
    },
  );

  // GET /api/seasons/current — current season info
  router.get('/api/seasons/current', auth, async (_req, res) => {
    try {
      const season = SeasonId.current();
      return res.json({
        seasonId: season.value,
        label: season.label,
        quarter: season.quarter,
        year: season.year,
        startDate: season.startDate().toISOString(),
        endDate: season.endDate().toISOString(),
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch season' } });
    }
  });

  return router;
}
