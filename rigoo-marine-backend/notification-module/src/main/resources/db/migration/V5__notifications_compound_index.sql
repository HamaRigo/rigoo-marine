-- Performance: the notification bell polls /api/notifications/my/unread-count
-- every 30 seconds for every logged-in client. The repository call is
--     SELECT COUNT(*) FROM notifications WHERE client_id = ? AND read = false
-- but V1's indexes are (client_id) AND (read) separately — Postgres can use
-- one, but not both, leaving a per-client read=false predicate as a scan.
--
-- Compound index on (client_id, read) lets the planner satisfy the entire
-- WHERE clause from the index. Tuple-order matters: client_id first because
-- it's the high-cardinality column; read second because it's boolean (low
-- cardinality but always present in the predicate).
--
-- Idempotent CREATE INDEX IF NOT EXISTS so a re-run on partially-migrated
-- DBs is safe.

CREATE INDEX IF NOT EXISTS idx_notifications_client_read
    ON notifications(client_id, read);

-- Also tag a covering index on created_at since the paged feed always
-- sorts by createdAt DESC and uses client_id as the key. Same composite
-- principle.
CREATE INDEX IF NOT EXISTS idx_notifications_client_created
    ON notifications(client_id, created_at DESC);

COMMENT ON INDEX idx_notifications_client_read IS
    'Bell badge: satisfies WHERE client_id = ? AND read = false without a heap scan.';
COMMENT ON INDEX idx_notifications_client_created IS
    'Paged feed: WHERE client_id = ? ORDER BY created_at DESC is index-only.';
