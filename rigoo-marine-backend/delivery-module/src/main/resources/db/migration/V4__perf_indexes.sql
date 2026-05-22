-- Performance: indexes missing from initial delivery schema
-- delivery_tasks.invoice_id: FK join with invoice-service, no index
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_invoice_id
    ON delivery_tasks(invoice_id);

-- delivery_positions.delivery_task_id: position history is queried per task
CREATE INDEX IF NOT EXISTS idx_delivery_positions_task_id
    ON delivery_positions(delivery_task_id);
