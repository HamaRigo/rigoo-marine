CREATE TABLE delivery_tasks (
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

CREATE INDEX idx_delivery_task_date   ON delivery_tasks(scheduled_date, assigned_to);
CREATE INDEX idx_delivery_task_status ON delivery_tasks(status);
CREATE INDEX idx_delivery_task_assigned ON delivery_tasks(assigned_to);
