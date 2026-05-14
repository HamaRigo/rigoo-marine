-- Engine-hours state for maintenance-service. NULL-tolerant: legacy vessels
-- and vessels whose owners haven't started logging history yet simply have
-- no reading, and the maintenance UI surfaces a banner inviting them to set one.
--
-- Updated by maintenance-service via the internal PATCH endpoint added in this
-- same release; never edited directly through the public vessel-update flow.

ALTER TABLE vessels
    ADD COLUMN IF NOT EXISTS current_engine_hours    DECIMAL(10,1),
    ADD COLUMN IF NOT EXISTS engine_hours_updated_at TIMESTAMP;
