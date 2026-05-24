-- Reviewer audit trail: who reviewed a listing, their role, and when

ALTER TABLE boat_listings
    ADD COLUMN IF NOT EXISTS reviewed_by_email  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reviewed_by_role   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMP;
