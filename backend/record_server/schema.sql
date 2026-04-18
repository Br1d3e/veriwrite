
CREATE TABLE IF NOT EXISTS docs (
    d_id TEXT PRIMARY KEY,
    v INTEGER NOT NULL,
    t0 BIGINT NOT NULL,
    title TEXT,
    author TEXT,
    created_server_ts BIGINT NOT NULL,
    updated_server_ts BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    d_id TEXT NOT NULL REFERENCES docs(d_id) ON DELETE CASCADE,
    v INTEGER NOT NULL,
    st0 BIGINT NOT NULL,
    ih TEXT NOT NULL,
    eh TEXT,
    init_text TEXT,
    current_text TEXT,
    current_dsh TEXT,
    session_key_b64 TEXT NOT NULL,
    ev JSONB NOT NULL DEFAULT '[]'::jsonb,
    block_count INTEGER NOT NULL DEFAULT 0,
    continuity_status TEXT NOT NULL DEFAULT 'UNKNOWN',
    dt BIGINT,
    merkle_root TEXT,
    final_receipt JSONB,
    created_server_ts BIGINT NOT NULL,
    closed_server_ts BIGINT
);

CREATE TABLE IF NOT EXISTS blocks (
    sid TEXT NOT NULL REFERENCES sessions(sid) ON DELETE CASCADE,
    q INTEGER NOT NULL,
    d_id TEXT NOT NULL REFERENCES docs(d_id) ON DELETE CASCADE,
    ph TEXT,
    ch TEXT NOT NULL,
    iv_b64 TEXT NOT NULL,
    ct_b64 TEXT NOT NULL,
    tag_b64 TEXT NOT NULL,
    dt0 BIGINT,
    dtn BIGINT,
    init_dsh TEXT,
    dsh TEXT,
    ev JSONB NOT NULL DEFAULT '[]'::jsonb,
    receipt JSONB,
    received_server_ts BIGINT NOT NULL,
    valid_q BOOLEAN NOT NULL,
    valid_h BOOLEAN NOT NULL,
    valid_dsh BOOLEAN NOT NULL,
    PRIMARY KEY (sid, q),
    UNIQUE (sid, ch)
);

CREATE INDEX IF NOT EXISTS idx_sessions_d_id ON sessions(d_id);
CREATE INDEX IF NOT EXISTS idx_blocks_d_id ON blocks(d_id);
CREATE INDEX IF NOT EXISTS idx_blocks_ch ON blocks(ch);
