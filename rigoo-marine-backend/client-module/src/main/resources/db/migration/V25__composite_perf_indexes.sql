-- Performance indexes for the most-common filtered/sorted queries.
--
-- Each index targets a specific access pattern observed in the dashboard and
-- admin views.  The composite ordering (equality column first, then the sort
-- column) lets PostgreSQL satisfy both the WHERE predicate and the ORDER BY
-- with a single index scan instead of a separate sort step.
--
-- All indexes are created with IF NOT EXISTS so the migration is idempotent and
-- safe to re-run.  Standard (non-CONCURRENT) index creation is used so Flyway
-- can wrap the migration in its normal transaction; each index takes an
-- ACCESS SHARE lock on the table, which does not block reads or writes.

-- "List my invoices ordered by date" — most common dashboard query.
CREATE INDEX IF NOT EXISTS idx_invoices_client_created
    ON invoices(client_id, created_at DESC);

-- "All unpaid invoices for this client" — finance hub filter.
CREATE INDEX IF NOT EXISTS idx_invoices_client_status_created
    ON invoices(client_id, status, created_at DESC);

-- "Unread notifications for this user" — bell badge + notification feed.
CREATE INDEX IF NOT EXISTS idx_notifications_client_read_created
    ON notifications(client_id, read, created_at DESC);

-- "Active work orders for a client, newest first" — client dashboard.
CREATE INDEX IF NOT EXISTS idx_work_orders_client_status_updated
    ON work_orders(client_id, status, updated_at DESC);

-- "Pending-approval orders across all clients" — team-lead approvals hub.
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created
    ON work_orders(status, created_at DESC);

COMMENT ON INDEX idx_invoices_client_created IS
    'Client invoice list ordered by date — avoids seq-scan + sort.';
COMMENT ON INDEX idx_invoices_client_status_created IS
    'Client invoice list filtered by status — finance hub / outstanding balance.';
COMMENT ON INDEX idx_notifications_client_read_created IS
    'Unread notification count + ordered feed per client — bell badge query.';
COMMENT ON INDEX idx_work_orders_client_status_updated IS
    'Work order list per client filtered by status — client dashboard.';
COMMENT ON INDEX idx_work_orders_status_created IS
    'Pending-approval queue across all clients — team-lead approvals view.';
