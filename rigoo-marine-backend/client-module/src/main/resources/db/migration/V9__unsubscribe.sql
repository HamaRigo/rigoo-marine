-- One-click email unsubscribe (Qatar PDPL + general best-practice).
--
-- Two columns:
--   unsubscribe_token    — opaque per-user secret carried in every outbound
--                          email's footer URL. Random UUID; can be rotated
--                          by the operator without touching the user
--                          (re-issuing nukes any in-the-wild links — wanted
--                          on key-leak incidents).
--   notifications_paused — soft opt-out flag honoured by EmailTemplateService
--                          before any MailSender.send call. Defaults to
--                          FALSE so existing users stay opted in.
--
-- Backfill: pgcrypto's gen_random_uuid() seeds tokens for every existing row.
-- The migration is idempotent (IF NOT EXISTS on column, conditional UPDATE on
-- backfill) so a re-run on a partially-migrated DB is safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS unsubscribe_token    VARCHAR(64),
    ADD COLUMN IF NOT EXISTS notifications_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill any rows that don't yet have a token. Generator: UUID, hex-only
-- chars so the URL is clean. Using gen_random_uuid()::text gives us 36 chars
-- including the standard 8-4-4-4-12 hyphenation, which is fine for URL use.
UPDATE clients
   SET unsubscribe_token = gen_random_uuid()::text
 WHERE unsubscribe_token IS NULL;

-- Now that every row has a token, enforce NOT NULL + uniqueness.
ALTER TABLE clients ALTER COLUMN unsubscribe_token SET NOT NULL;

-- Unique index doubles as the lookup index for /unsubscribe?t=<token>.
-- Conditional create so a re-run doesn't blow up on the existing index name.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE tablename = 'clients' AND indexname = 'ux_clients_unsub_token'
    ) THEN
        CREATE UNIQUE INDEX ux_clients_unsub_token ON clients(unsubscribe_token);
    END IF;
END $$;

COMMENT ON COLUMN clients.unsubscribe_token IS
    'Opaque per-user secret carried in outbound email unsubscribe URLs. Rotate to invalidate in-the-wild links.';
COMMENT ON COLUMN clients.notifications_paused IS
    'When TRUE, EmailTemplateService skips every send for this user. In-app notifications still surface.';
