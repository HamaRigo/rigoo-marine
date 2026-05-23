-- Performance indexes for delivery module
-- delivery_tasks.invoice_id: FK join with invoice-service
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_invoice_id
    ON delivery_tasks(invoice_id);

-- delivery_tasks.assigned_to: list tasks assigned to a technician
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_assigned_to
    ON delivery_tasks(assigned_to);

-- delivery_tasks.status: filter by PENDING/IN_PROGRESS/DELIVERED etc.
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_status
    ON delivery_tasks(status);

-- delivery_tasks.scheduled_date: sort/filter by delivery date
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_scheduled_date
    ON delivery_tasks(scheduled_date DESC);

-- delivery_positions.tech_id: live-tracking queries fetch positions per technician
CREATE INDEX IF NOT EXISTS idx_delivery_positions_tech_id
    ON delivery_positions(tech_id);

-- delivery_positions.recorded_at: position history ordered by time
CREATE INDEX IF NOT EXISTS idx_delivery_positions_recorded_at
    ON delivery_positions(recorded_at DESC);
