-- Photos, videos, and documents uploaded against a work order
-- by technicians or team leads (before/after evidence, part receipts, etc.).

CREATE TABLE work_order_attachments (
    id            BIGSERIAL    PRIMARY KEY,
    work_order_id BIGINT       NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    uploaded_by   BIGINT       NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255),
    content_type  VARCHAR(100),
    file_size     BIGINT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wo_attachments_order ON work_order_attachments(work_order_id);
