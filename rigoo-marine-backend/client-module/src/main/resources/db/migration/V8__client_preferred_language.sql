-- Per-client preferred language for outbound communications (email, in future
-- SMS). 2-letter BCP-47 prefix is sufficient for our EN/AR market — column kept
-- intentionally narrow.
--
-- Default 'en' for existing rows. Notification consumers
-- (ShopOrderEventConsumer, ServiceDueEventConsumer via RecipientLookup) resolve
-- a per-recipient locale from this column instead of the hard-coded 'en' that
-- shipped with the OTP work.

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'en';

-- Backfill safety: explicitly normalise any pre-existing nulls if the IF NOT
-- EXISTS path silently skipped a re-run (defensive — no-op on a fresh install).
UPDATE clients SET preferred_language = 'en' WHERE preferred_language IS NULL;
