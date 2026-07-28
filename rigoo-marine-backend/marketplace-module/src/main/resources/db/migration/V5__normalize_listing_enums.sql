-- Normalize legacy/free-text enum values before admin "ALL" queries hydrate
-- every listing through JPA EnumType.STRING.
--
-- WHERE clauses use exact (case-sensitive) membership so mixed-case or padded
-- values like 'Available' / ' available ' are rewritten before CHECKs apply.

UPDATE boat_listings
SET status = CASE
    WHEN UPPER(TRIM(status)) IN ('PENDING', 'PENDING_APPROVAL', 'PENDING_REVIEW') THEN 'PENDING_REVIEW'
    WHEN UPPER(TRIM(status)) IN ('ACTIVE', 'APPROVED', 'PUBLISHED', 'AVAILABLE') THEN 'AVAILABLE'
    WHEN UPPER(TRIM(status)) = 'RESERVED' THEN 'RESERVED'
    WHEN UPPER(TRIM(status)) = 'SOLD' THEN 'SOLD'
    WHEN UPPER(TRIM(status)) IN ('INACTIVE', 'ARCHIVED') THEN 'ARCHIVED'
    WHEN UPPER(TRIM(status)) = 'REJECTED' THEN 'REJECTED'
    WHEN UPPER(TRIM(status)) = 'DRAFT' THEN 'DRAFT'
    ELSE 'DRAFT'
END
WHERE status IS NULL
   OR status NOT IN ('DRAFT', 'PENDING_REVIEW', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED', 'REJECTED');

UPDATE boat_listings
SET seller_type = CASE
    WHEN UPPER(TRIM(seller_type)) = 'PRIVATE' THEN 'PRIVATE'
    ELSE 'DEALER'
END
WHERE seller_type IS NULL
   OR seller_type NOT IN ('DEALER', 'PRIVATE');

UPDATE boat_listings
SET captain_required = CASE
    WHEN UPPER(TRIM(captain_required)) IN ('NEVER', 'OPTIONAL', 'INCLUDED')
        THEN UPPER(TRIM(captain_required))
    ELSE NULL
END
WHERE captain_required IS NOT NULL
  AND captain_required NOT IN ('NEVER', 'OPTIONAL', 'INCLUDED');

ALTER TABLE boat_listings
    ADD CONSTRAINT chk_boat_listings_status
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED', 'REJECTED'));

ALTER TABLE boat_listings
    ADD CONSTRAINT chk_boat_listings_seller_type
    CHECK (seller_type IN ('DEALER', 'PRIVATE'));

ALTER TABLE boat_listings
    ADD CONSTRAINT chk_boat_listings_captain_required
    CHECK (captain_required IS NULL OR captain_required IN ('NEVER', 'OPTIONAL', 'INCLUDED'));
