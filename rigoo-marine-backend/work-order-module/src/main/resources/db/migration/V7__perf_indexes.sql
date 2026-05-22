-- Performance: add missing indexes identified in the audit
-- work_orders.vessel_id: FK used in service history + order search filters
CREATE INDEX IF NOT EXISTS idx_work_orders_vessel_id
    ON work_orders(vessel_id);

-- work_orders.created_at: ORDER BY created_at DESC is the default sort on every list page
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at
    ON work_orders(created_at DESC);

-- Composite: status+created_at covers the admin "filter by status, sort by date" query
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created
    ON work_orders(status, created_at DESC);

-- work_order_notes.technician_id: FK with no index; JOIN to technician is common
CREATE INDEX IF NOT EXISTS idx_work_order_notes_technician_id
    ON work_order_notes(technician_id);

-- time_entries.technician_id: time-tracking queries filter by technician
CREATE INDEX IF NOT EXISTS idx_time_entries_technician_id
    ON time_entries(technician_id);

-- inventory_parts: audit/search by category and name are the primary query paths
CREATE INDEX IF NOT EXISTS idx_inventory_parts_category
    ON inventory_parts(category);

CREATE INDEX IF NOT EXISTS idx_inventory_parts_name
    ON inventory_parts(name);
