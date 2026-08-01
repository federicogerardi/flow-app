-- Migration 006: Platform Configuration
-- LLM models, API services, tool step bindings

BEGIN;

CREATE TABLE llm_models (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label      VARCHAR(100) NOT NULL,
    provider   VARCHAR(50)  NOT NULL,
    model_id   VARCHAR(100) NOT NULL,
    tier       VARCHAR(20)  NOT NULL,
    enabled    BOOLEAN      NOT NULL DEFAULT true,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE api_services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label             VARCHAR(100)  NOT NULL,
    endpoint          VARCHAR(500)  NOT NULL,
    auth_header_name  VARCHAR(100),
    auth_header_value VARCHAR(500),
    enabled           BOOLEAN       NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE tool_step_bindings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_key       VARCHAR(100) NOT NULL,
    step_order     INTEGER      NOT NULL,
    api_service_id UUID         NOT NULL REFERENCES api_services(id),

    CONSTRAINT uq_tool_step_binding UNIQUE (tool_key, step_order)
);

COMMIT;
