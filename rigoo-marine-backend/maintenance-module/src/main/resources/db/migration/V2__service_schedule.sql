-- Maintenance schedule: one row per (vessel, service_type) describing when the next
-- occurrence is due. interval_days OR interval_hours (or both) drives recurrence;
-- next_due_date / next_due_hours are computed by the application layer when a
-- ServiceHistoryRecord of the matching type is logged.
--
-- last_notified_at debounces the nightly reminder sweep (re-notify cooldown is
-- configurable via app.maintenance.reminders.renotify-cooldown-days).
-- snoozed_until skips reminders for ad-hoc client snoozes.

CREATE TABLE IF NOT EXISTS service_schedule (
    id BIGSERIAL PRIMARY KEY,
    vessel_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    service_type VARCHAR(40) NOT NULL,
    interval_days INTEGER,
    interval_hours DECIMAL(10,1),
    next_due_date DATE,
    next_due_hours DECIMAL(10,1),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_notified_at TIMESTAMP,
    snoozed_until DATE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_schedule_vessel_type UNIQUE (vessel_id, service_type),
    CONSTRAINT ck_schedule_at_least_one_interval CHECK (interval_days IS NOT NULL OR interval_hours IS NOT NULL),
    CONSTRAINT ck_schedule_interval_positive CHECK (
        (interval_days  IS NULL OR interval_days  > 0) AND
        (interval_hours IS NULL OR interval_hours > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_service_schedule_vessel ON service_schedule(vessel_id);
CREATE INDEX IF NOT EXISTS idx_service_schedule_client ON service_schedule(client_id);
-- Reminder sweep predicate: status=ACTIVE AND not snoozed AND due-soon.
CREATE INDEX IF NOT EXISTS idx_service_schedule_due_sweep
    ON service_schedule(status, next_due_date)
    WHERE status = 'ACTIVE';
