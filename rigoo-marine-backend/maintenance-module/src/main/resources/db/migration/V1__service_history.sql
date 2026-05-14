-- Maintenance history: immutable log of services performed on a vessel.
-- Oil changes are first-class via service_type=OIL_CHANGE; other types are open-ended
-- (see ServiceType enum). performed_on is a LocalDate (calendar day, not timestamp);
-- engine_hours_at_service is nullable for non-hour-based services (e.g. INSPECTION).
-- client_id is denormalised so the my-history query stays single-table.

CREATE TABLE IF NOT EXISTS service_history (
    id BIGSERIAL PRIMARY KEY,
    vessel_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    service_type VARCHAR(40) NOT NULL,
    performed_on DATE NOT NULL,
    engine_hours_at_service DECIMAL(10,1),
    cost DECIMAL(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'QAR',
    performed_by VARCHAR(255),
    technician_id BIGINT,
    work_order_id BIGINT,
    notes VARCHAR(2000),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_history_vessel ON service_history(vessel_id, performed_on DESC);
CREATE INDEX IF NOT EXISTS idx_service_history_client ON service_history(client_id, performed_on DESC);
CREATE INDEX IF NOT EXISTS idx_service_history_type ON service_history(vessel_id, service_type, performed_on DESC);
