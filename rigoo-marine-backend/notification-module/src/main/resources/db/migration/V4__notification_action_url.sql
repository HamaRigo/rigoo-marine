-- Notifications optionally carry a deep-link URL that the frontend renders
-- as a "Book now" / "Open" button. Drives the revenue loop: a SERVICE_DUE
-- email reminder lands an in-app row + a pre-filled service-request URL
-- that turns the reminder into a work order in one click.
--
-- Nullable — most notification types still go without (informational rows
-- like "Order paid" don't need an action). Length capped at 500 to match
-- the rest of the URL/text columns in this database.

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(500);

COMMENT ON COLUMN notifications.action_url IS
    'Optional deep-link rendered as a button on the in-app notification row. NULL for informational rows.';
