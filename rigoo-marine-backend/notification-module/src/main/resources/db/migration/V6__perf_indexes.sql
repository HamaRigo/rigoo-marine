-- Performance: compound index for the bell badge query
-- "SELECT COUNT(*) WHERE client_id = ? AND read = false ORDER BY created_at DESC"
-- The existing separate indexes (client_id), (read) can't be merged by the planner
-- as efficiently as a single compound covering index.
CREATE INDEX IF NOT EXISTS idx_notifications_client_unread_date
    ON notifications(client_id, read, created_at DESC)
    WHERE read = false;
