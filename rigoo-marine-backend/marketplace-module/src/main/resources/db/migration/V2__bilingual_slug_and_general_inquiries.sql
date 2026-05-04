-- V2 — bilingual content, SEO slug, and general (listing-less) inquiries.
-- Decisions (locked): A1 full bilingual content; B1 real slug column; C nullable listing_id
-- with a CHECK constraint enforcing listing_id presence for BUY/RENT/INSPECTION.

-- ---------- boat_listings: bilingual + slug ----------

ALTER TABLE boat_listings
    ADD COLUMN title_en VARCHAR(255),
    ADD COLUMN title_ar VARCHAR(255),
    ADD COLUMN description_en TEXT,
    ADD COLUMN description_ar TEXT,
    ADD COLUMN known_issues_en TEXT,
    ADD COLUMN known_issues_ar TEXT,
    ADD COLUMN inclusions_en TEXT,
    ADD COLUMN inclusions_ar TEXT,
    ADD COLUMN slug VARCHAR(255);

-- Backfill existing single-locale data into the _en columns (treat current rows as English).
UPDATE boat_listings
SET title_en = title,
    description_en = description,
    known_issues_en = known_issues,
    inclusions_en = inclusions;

-- Backfill slug from title_en + id (deterministic, collision-free thanks to id suffix).
UPDATE boat_listings
SET slug = LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(COALESCE(NULLIF(title_en, ''), 'boat'), '[^a-zA-Z0-9]+', '-', 'g'),
            '(^-|-$)', '', 'g'
        )
    ) || '-' || id;

ALTER TABLE boat_listings
    ALTER COLUMN title_en SET NOT NULL,
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT uk_boat_listings_slug UNIQUE (slug);

CREATE INDEX IF NOT EXISTS idx_boat_listings_slug ON boat_listings(slug);

-- Drop legacy single-locale columns (no consumers — backend has not shipped yet).
ALTER TABLE boat_listings
    DROP COLUMN title,
    DROP COLUMN description,
    DROP COLUMN known_issues,
    DROP COLUMN inclusions;

-- ---------- boat_inquiries: nullable listing_id + integrity check ----------

ALTER TABLE boat_inquiries
    ALTER COLUMN listing_id DROP NOT NULL;

-- Listing-bound inquiry types must reference a listing; GENERAL may or may not.
ALTER TABLE boat_inquiries
    ADD CONSTRAINT ck_boat_inquiries_listing_required
    CHECK (
        (inquiry_type IN ('BUY', 'RENT', 'INSPECTION') AND listing_id IS NOT NULL)
        OR inquiry_type = 'GENERAL'
    );
