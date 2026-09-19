CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE lockout (
    identity TEXT PRIMARY KEY,
    failures INT NOT NULL DEFAULT 0,
    blocked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL DEFAULT '',
    moment_at TIMESTAMPTZ NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE record_tags (
    record_id UUID NOT NULL REFERENCES records(id),
    tag_id UUID NOT NULL REFERENCES tags(id),
    PRIMARY KEY (record_id, tag_id)
);

CREATE INDEX idx_records_moment_at ON records (moment_at) WHERE NOT deleted;
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
