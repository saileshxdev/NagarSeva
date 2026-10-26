-- OTP table — stores temporary codes for email verification and password reset
CREATE TABLE IF NOT EXISTS otps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    code        VARCHAR(6) NOT NULL,        -- 6-digit OTP
    type        VARCHAR(20) NOT NULL        -- 'VERIFY_EMAIL' | 'RESET_PASSWORD'
                CHECK (type IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    used        BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete expired OTPs (run periodically or via pg_cron)
CREATE INDEX IF NOT EXISTS idx_otps_email_type ON otps (email, type);
CREATE INDEX IF NOT EXISTS idx_otps_expires    ON otps (expires_at);
