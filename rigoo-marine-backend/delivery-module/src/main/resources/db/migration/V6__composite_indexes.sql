-- Composite indexes replacing single-column ones for multi-predicate queries.
-- Each covers the most common filter+sort combinations in DeliveryTaskRepository.

-- Primary workhorse: driver dashboard (assigned_to + date) and admin per-driver view
CREATE INDEX IF NOT EXISTS idx_dt_assigned_date
    ON delivery_tasks(assigned_to, scheduled_date DESC);

-- Admin date-first queries: list all tasks for a given date, optionally filtered by driver
CREATE INDEX IF NOT EXISTS idx_dt_date_assigned
    ON delivery_tasks(scheduled_date DESC, assigned_to)
    WHERE assigned_to IS NOT NULL;

-- Admin date+status filter
CREATE INDEX IF NOT EXISTS idx_dt_date_status
    ON delivery_tasks(scheduled_date DESC, status);

-- Most selective admin filter: date + driver + status
CREATE INDEX IF NOT EXISTS idx_dt_assigned_date_status
    ON delivery_tasks(assigned_to, scheduled_date DESC, status);

-- History range queries (driver and admin history pages)
CREATE INDEX IF NOT EXISTS idx_dt_assigned_date_range
    ON delivery_tasks(assigned_to, scheduled_date DESC, id DESC);

-- Position history: tech + time (replaces single tech_id index for ordered queries)
CREATE INDEX IF NOT EXISTS idx_dp_tech_recorded
    ON delivery_positions(tech_id, recorded_at DESC);

-- Covering index for active-driver detection query (findActiveTechIdsForDate)
CREATE INDEX IF NOT EXISTS idx_dt_date_assigned_status
    ON delivery_tasks(scheduled_date, assigned_to, status)
    WHERE assigned_to IS NOT NULL;
