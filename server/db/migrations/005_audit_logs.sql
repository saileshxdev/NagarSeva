CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id    UUID REFERENCES issues(id),
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    changed_by  UUID REFERENCES users(id),
    note        TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_issue ON audit_logs (issue_id, created_at);