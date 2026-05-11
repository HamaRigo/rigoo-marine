-- Adds redrive bookkeeping to email_outbox. The columns are populated for
-- existing FAILED rows so they enter the redrive cycle on next deploy.

ALTER TABLE email_outbox
    ADD COLUMN next_retry_at    TIMESTAMP,
    ADD COLUMN claimed_at       TIMESTAMP,
    ADD COLUMN redrive_attempts INTEGER NOT NULL DEFAULT 0;

-- Backfill: any pre-existing FAILED row should be retried in ~5 min after
-- deploy (the standard backoff for the first redrive attempt).
UPDATE email_outbox
SET next_retry_at = created_at + INTERVAL '5 minutes',
    redrive_attempts = 0
WHERE status = 'FAILED' AND next_retry_at IS NULL;

-- Hot path for the redriver: pick FAILED rows due now, ordered by oldest first.
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_next_retry
    ON email_outbox(status, next_retry_at);

-- Hot path for stale-claim recovery: find RETRYING rows whose worker died.
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_claimed
    ON email_outbox(status, claimed_at)
    WHERE status = 'RETRYING';

COMMENT ON COLUMN email_outbox.next_retry_at IS 'When the redriver should next attempt this row. NULL for SENT/DEAD.';
COMMENT ON COLUMN email_outbox.claimed_at    IS 'Set when status moves to RETRYING; stale claims (>5min) get reclaimed.';
COMMENT ON COLUMN email_outbox.redrive_attempts IS 'Number of post-failure redrive attempts (separate from initial in-process retry count).';
