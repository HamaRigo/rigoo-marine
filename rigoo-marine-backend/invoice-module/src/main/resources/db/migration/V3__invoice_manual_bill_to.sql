-- Allow invoices to be created for clients not registered in the system.
-- work_order_id and client_id become optional; at least one of client_id or
-- bill_to_name must be supplied (enforced at the application layer).

ALTER TABLE invoices ALTER COLUMN work_order_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN client_id     DROP NOT NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_name    VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_email   VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_phone   VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_address VARCHAR(500);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bill_to_company VARCHAR(255);

-- Same for quotations so both documents are consistent.
ALTER TABLE quotations ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bill_to_name    VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bill_to_email   VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bill_to_phone   VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bill_to_address VARCHAR(500);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bill_to_company VARCHAR(255);
