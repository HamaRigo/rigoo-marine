CREATE TABLE IF NOT EXISTS vessel_inspections (
    id                   BIGSERIAL PRIMARY KEY,
    vessel_id            BIGINT NOT NULL,
    client_id            BIGINT NOT NULL,
    inspector_id         BIGINT,
    inspection_date      DATE NOT NULL,
    type                 VARCHAR(50) NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    findings             TEXT,
    notes                TEXT,
    next_inspection_date DATE,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vessel_inspections_vessel_id ON vessel_inspections(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_inspections_client_id ON vessel_inspections(client_id);
CREATE INDEX IF NOT EXISTS idx_vessel_inspections_status    ON vessel_inspections(status);
CREATE INDEX IF NOT EXISTS idx_vessel_inspections_date      ON vessel_inspections(inspection_date);
