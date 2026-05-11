-- Outbox for emails that failed all in-process retries. ops inspects/replays from
-- here. Empty in steady state; only written on the @Recover path of SmtpMailSender.
CREATE TABLE IF NOT EXISTS email_outbox (
    id              BIGSERIAL PRIMARY KEY,
    template_name   VARCHAR(64),
    recipient       VARCHAR(320) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    body            TEXT NOT NULL,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'FAILED',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMP
);

-- Status filter is the hottest query (ops dashboard / future re-driver).
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created ON email_outbox(status, created_at);

COMMENT ON TABLE email_outbox IS 'Failed outbound emails after @Retryable exhaustion. Manual replay by ops.';
COMMENT ON COLUMN email_outbox.status IS 'FAILED on insert; ops can flip to RETRYING/SENT/DEAD.';
