-- Idempotency guarantee for the work-order auto-history flow. A Kafka redelivery
-- (or admin status-toggle on an already-completed WO) must not produce duplicate
-- history rows for the same (workOrderId, serviceType) pair.
--
-- Partial index — manual history entries don't carry workOrderId and are exempt.

CREATE UNIQUE INDEX IF NOT EXISTS ux_service_history_workorder_type
    ON service_history (work_order_id, service_type)
    WHERE work_order_id IS NOT NULL;
