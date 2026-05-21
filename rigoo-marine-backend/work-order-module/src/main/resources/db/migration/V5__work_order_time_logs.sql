-- V5: Technician time tracking per work order.
-- Each row is a clock-in event; clock_out NULL means still active.
-- Invariant (enforced in Java): at most one open row per work_order_id
-- at any point in time — prevents overlapping sessions from ambiguous
-- clock-in/clock-out sequences.

CREATE TABLE work_order_time_logs (
  id             BIGSERIAL    PRIMARY KEY,
  work_order_id  BIGINT       NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id  BIGINT       NOT NULL,
  clock_in       TIMESTAMP    NOT NULL DEFAULT NOW(),
  clock_out      TIMESTAMP,
  duration_min   INTEGER      GENERATED ALWAYS AS (
    CASE WHEN clock_out IS NOT NULL
         THEN EXTRACT(EPOCH FROM (clock_out - clock_in))::INTEGER / 60
         ELSE NULL
    END
  ) STORED,
  note           TEXT,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_log_order ON work_order_time_logs(work_order_id);
CREATE INDEX idx_time_log_tech  ON work_order_time_logs(technician_id, clock_in DESC);
