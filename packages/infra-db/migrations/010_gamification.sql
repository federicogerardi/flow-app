-- Migration 010: Gamification Bounded Context
-- Adds player profiles, achievements, XP ledger, event deduplication,
-- workspace leaderboard, challenges, and challenge contributions.

CREATE TABLE player_profiles (
    user_id          UUID PRIMARY KEY REFERENCES users(id),
    version          INTEGER NOT NULL DEFAULT 1,
    xp_total         INTEGER NOT NULL DEFAULT 0,
    current_streak   INTEGER NOT NULL DEFAULT 0,
    longest_streak   INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    badge_key   VARCHAR(50)  NOT NULL,
    awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);

CREATE TABLE xp_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id),
    amount       INTEGER      NOT NULL,
    source       VARCHAR(50)  NOT NULL,
    source_id    VARCHAR(120),
    workspace_id UUID,
    season_id    VARCHAR(10)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_user_season ON xp_transactions(user_id, season_id);
CREATE INDEX idx_xp_workspace_season ON xp_transactions(workspace_id, season_id);

CREATE TABLE gamification_processed_events (
    event_id     VARCHAR(120) PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_processed_expires ON gamification_processed_events(expires_at);

CREATE TABLE workspace_leaderboard (
    user_id      UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    xp           INTEGER NOT NULL DEFAULT 0,
    season_id    VARCHAR(10) NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, workspace_id, season_id)
);

CREATE TABLE workspace_challenges (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID         NOT NULL REFERENCES workspaces(id),
    challenge_key  VARCHAR(50)  NOT NULL,
    progress       INTEGER      NOT NULL DEFAULT 0,
    target         INTEGER      NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'active',
    week_start     DATE         NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    UNIQUE (workspace_id, challenge_key, week_start)
);

CREATE TABLE challenge_contributions (
    challenge_id UUID    NOT NULL REFERENCES workspace_challenges(id),
    user_id      UUID    NOT NULL REFERENCES users(id),
    amount       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (challenge_id, user_id)
);
