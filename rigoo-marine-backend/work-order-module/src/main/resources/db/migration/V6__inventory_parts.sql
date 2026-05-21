-- V6: Parts inventory.
-- inventory_parts  — catalogue of stocked parts (managed by admin/team-lead).
-- work_order_parts — line items linking a part request to a work order.
--
-- Design note: reorder_level is purely advisory; the application shows a
-- warning badge when quantity_on_hand <= reorder_level but does not block
-- operations. This keeps the inventory module lightweight — full procurement
-- workflows are out of scope for V1.

CREATE TABLE inventory_parts (
  id               BIGSERIAL    PRIMARY KEY,
  sku              VARCHAR(80)  NOT NULL UNIQUE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  quantity_on_hand INTEGER      NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level    INTEGER      NOT NULL DEFAULT 5  CHECK (reorder_level >= 0),
  unit_cost_qar    DECIMAL(10,2),
  supplier         VARCHAR(255),
  location         VARCHAR(120),     -- shelf / bin label (e.g. "A-3-2")
  category         VARCHAR(80),
  active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_sku      ON inventory_parts(sku);
CREATE INDEX idx_parts_category ON inventory_parts(category);
CREATE INDEX idx_parts_low_stock ON inventory_parts(quantity_on_hand)
  WHERE quantity_on_hand <= reorder_level AND active = TRUE;

CREATE TABLE work_order_parts (
  id            BIGSERIAL    PRIMARY KEY,
  work_order_id BIGINT       NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id       BIGINT       NOT NULL REFERENCES inventory_parts(id),
  quantity      INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status        VARCHAR(20)  NOT NULL DEFAULT 'REQUESTED',
  -- REQUESTED → ORDERED → RECEIVED → INSTALLED | RETURNED
  notes         TEXT,
  requested_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wo_parts_order ON work_order_parts(work_order_id);
CREATE INDEX idx_wo_parts_part  ON work_order_parts(part_id);
