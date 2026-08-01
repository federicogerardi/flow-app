-- Migration 005: Quotas + Credit Transactions
-- Usage & Quota context tables

BEGIN;

CREATE TABLE quotas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id),
    period              VARCHAR(7)   NOT NULL,
    plan_type           VARCHAR(20)  NOT NULL DEFAULT 'free',
    artifact_limit      INTEGER      NOT NULL DEFAULT 1000,
    artifact_count      INTEGER      NOT NULL DEFAULT 0,
    credit_limit        INTEGER      NOT NULL DEFAULT 250,
    credit_consumed     INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_quotas_user_period UNIQUE (user_id, period)
);

CREATE INDEX idx_quotas_user_id ON quotas(user_id);

CREATE TABLE credit_transactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_id   UUID               NOT NULL REFERENCES quotas(id),
    amount     INTEGER            NOT NULL,
    reason     transaction_reason NOT NULL,
    session_id UUID,
    created_at TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_quota_id   ON credit_transactions(quota_id);
CREATE INDEX idx_credit_transactions_session_id ON credit_transactions(session_id);

COMMIT;
