-- Idempotency table for Stripe webhook events.
-- First line of every handler does INSERT ... ON CONFLICT DO NOTHING + checks
-- whether the row was actually inserted; duplicates skip processing and return 200.
-- Standard pattern for at-least-once webhook delivery.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
    ON processed_stripe_events(processed_at DESC);
