-- Redis is the primary position store (key: delivery:position:{techId}, TTL 10 min).
-- This table is an audit fallback only, written asynchronously.
CREATE TABLE delivery_positions (
  id          BIGSERIAL PRIMARY KEY,
  tech_id     BIGINT       NOT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  accuracy    FLOAT,
  recorded_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_pos_tech ON delivery_positions(tech_id, recorded_at DESC);
