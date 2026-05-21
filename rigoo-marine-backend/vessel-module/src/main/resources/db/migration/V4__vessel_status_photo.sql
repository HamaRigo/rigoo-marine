-- Operational status and cover photo for the vessel profile page.
-- status defaults to ACTIVE for all existing rows.
-- photo_url is a CDN/S3 URL; null = no photo set (UI shows default avatar).

ALTER TABLE vessels
    ADD COLUMN IF NOT EXISTS status    VARCHAR(20)   DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1024);

UPDATE vessels SET status = 'ACTIVE' WHERE status IS NULL;
