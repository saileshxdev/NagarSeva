CREATE TABLE IF NOT EXISTS watchers (
    issue_id   UUID REFERENCES issues(id),
    user_id    UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (issue_id, user_id)
);