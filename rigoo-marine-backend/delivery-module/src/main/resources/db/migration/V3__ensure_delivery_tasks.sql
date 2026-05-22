-- V1 may have been recorded as a baseline (not executed) on databases created before
-- baseline-version was corrected to 0. This migration idempotently ensures the table exists.
CREATE TABLE IF NOT EXISTS delivery_tasks (
  id                BIGSERIAL PRIMARY KEY,
  type              VARCHAR(20)  NOT NULL,
  reference_id      BIGINT       NOT NULL,
  assigned_to       BIGINT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',

  pickup_label      VARCHAR(255),
  pickup_address    TEXT,
  pickup_lat        DECIMAL(9,6),
  pickup_lng        DECIMAL(9,6),

  delivery_address  TEXT         NOT NULL,
  delivery_lat      DECIMAL(9,6),
  delivery_lng      DECIMAL(9,6),

  client_phone      VARCHAR(20),
  invoice_id        BIGINT,
  invoice_amount    DECIMAL(10,2),
  currency          VARCHAR(5)   NOT NULL DEFAULT 'QAR',

  scheduled_date    DATE         NOT NULL,
  stop_order        INTEGER,
  notes             TEXT,
  proof_photo_path  VARCHAR(500),
  delivered_at      TIMESTAMP,
  failed_reason     TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_task_date     ON delivery_tasks(scheduled_date, assigned_to);
CREATE INDEX IF NOT EXISTS idx_delivery_task_status   ON delivery_tasks(status);
CREATE INDEX IF NOT EXISTS idx_delivery_task_assigned ON delivery_tasks(assigned_to);

-- Ensure delivery_positions also exists in case V2 had the same problem.
CREATE TABLE IF NOT EXISTS delivery_positions (
  id          BIGSERIAL PRIMARY KEY,
  tech_id     BIGINT       NOT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  accuracy    FLOAT,
  recorded_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_pos_tech ON delivery_positions(tech_id, recorded_at DESC);
