-- Performance: indexes missing from initial schema
-- invoices.status: filter-by-status is the most common admin query
CREATE INDEX IF NOT EXISTS idx_invoices_status
    ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
    ON invoices(created_at DESC);

-- invoice_inserted_images.invoice_id: join table with no index — full scan on every PDF render
CREATE INDEX IF NOT EXISTS idx_invoice_inserted_images_invoice_id
    ON invoice_inserted_images(invoice_id);

-- quotation_inserted_images.quotation_id: same pattern
CREATE INDEX IF NOT EXISTS idx_quotation_inserted_images_quotation_id
    ON quotation_inserted_images(quotation_id);

-- quotations.status + created_at: mirror of invoices query pattern
CREATE INDEX IF NOT EXISTS idx_quotations_status
    ON quotations(status);

CREATE INDEX IF NOT EXISTS idx_quotations_created_at
    ON quotations(created_at DESC);
