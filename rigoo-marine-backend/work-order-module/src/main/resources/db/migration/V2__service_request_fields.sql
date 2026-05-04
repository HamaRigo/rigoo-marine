-- Service Request Form (Task #5): extend work_orders for client/technician submissions.

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS location_text VARCHAR(500),
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS submitted_by_role VARCHAR(20),
    ADD COLUMN IF NOT EXISTS issue_category_other VARCHAR(255),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approved_by BIGINT;

CREATE INDEX IF NOT EXISTS idx_work_orders_submitted_by_role ON work_orders(submitted_by_role);
