-- Performance: the nightly reminder sweep query in ServiceScheduleItemRepository
-- filters on (status='ACTIVE', snoozed_until, last_notified_at, next_due_date)
-- in one go. V2's partial index covers (status, next_due_date) WHERE status='ACTIVE',
-- which lets the planner scan the ACTIVE subset but can't use snoozed_until /
-- last_notified_at predicates index-only.
--
-- Composite partial index covering the full predicate. Column order chosen
-- so a scan can short-circuit:
--   - snoozed_until first (NULL most rows; quick to eliminate non-NULL future
--     dates)
--   - last_notified_at second (the cooldown debounce; usually a recent
--     timestamp comparison)
--   - next_due_date last (the actual hot filter the planner walks)
--
-- WHERE status = 'ACTIVE' keeps the index small — ACTIVE is the only state
-- the sweep ever touches.

CREATE INDEX IF NOT EXISTS idx_service_schedule_sweep_composite
    ON service_schedule (snoozed_until, last_notified_at, next_due_date)
    WHERE status = 'ACTIVE';

COMMENT ON INDEX idx_service_schedule_sweep_composite IS
    'Composite partial index for the nightly reminder sweep predicate. Supersedes idx_service_schedule_due_sweep for the multi-column case; the original is kept for any callers that filter on status+next_due_date alone.';
