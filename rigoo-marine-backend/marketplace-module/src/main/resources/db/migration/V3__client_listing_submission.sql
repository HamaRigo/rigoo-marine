-- Client listing submission support: company gain % and rejection reason

ALTER TABLE boat_listings
    ADD COLUMN IF NOT EXISTS company_gain_pct NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
