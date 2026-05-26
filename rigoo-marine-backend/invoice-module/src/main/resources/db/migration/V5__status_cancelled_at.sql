-- Add cancelled_at timestamp for CANCELLED → ARCHIVED auto-archive logic (24 h).
-- Also widens the status column to accommodate the new ARCHIVED status value.

ALTER TABLE invoices   ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
