-- Fuel consumption log per vessel.
-- Supports both volume-based tracking (liters_added) and cost tracking.
-- price_per_liter and total_cost are both optional: operators may only record
-- volume, or only cost, or all three.  total_cost wins for analytics; if absent,
-- it is computed as liters_added * price_per_liter in the analytics query.
-- Cascades DELETE with the parent vessel.

CREATE TABLE IF NOT EXISTS fuel_logs (
    id                   BIGSERIAL     PRIMARY KEY,
    vessel_id            BIGINT        NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    client_id            BIGINT        NOT NULL,
    log_date             DATE          NOT NULL,
    liters_added         DECIMAL(10,2) NOT NULL,
    price_per_liter      DECIMAL(8,3),
    total_cost           DECIMAL(12,2),
    currency             VARCHAR(3)    NOT NULL DEFAULT 'QAR',
    engine_hours_at_fuel DECIMAL(10,1),
    port_name            VARCHAR(255),
    notes                VARCHAR(500),
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fuel_liters        CHECK (liters_added > 0),
    CONSTRAINT chk_fuel_price_pos     CHECK (price_per_liter IS NULL OR price_per_liter >= 0),
    CONSTRAINT chk_fuel_cost_pos      CHECK (total_cost IS NULL OR total_cost >= 0),
    CONSTRAINT chk_fuel_hours_pos     CHECK (engine_hours_at_fuel IS NULL OR engine_hours_at_fuel >= 0),
    CONSTRAINT chk_fuel_currency_len  CHECK (char_length(currency) = 3)
);

-- Primary read pattern: vessel timeline descending
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vessel
    ON fuel_logs (vessel_id, log_date DESC);

-- Ownership + date range (analytics query filter)
CREATE INDEX IF NOT EXISTS idx_fuel_logs_client_date
    ON fuel_logs (client_id, log_date DESC);

-- Port-name search (future feature)
CREATE INDEX IF NOT EXISTS idx_fuel_logs_port
    ON fuel_logs (vessel_id, port_name)
    WHERE port_name IS NOT NULL;
