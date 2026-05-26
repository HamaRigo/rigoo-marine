-- Link invoices to shop-module orders so a paid cart order can produce
-- exactly one invoice and be retrieved by shopOrderId.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shop_order_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_invoices_shop_order_id ON invoices(shop_order_id);
