-- Performance: indexes missing from initial schema
-- media.active: every public media query filters WHERE active = true
CREATE INDEX IF NOT EXISTS idx_media_active
    ON media(active) WHERE active = true;

-- media.type + active: combined filter on media type for admin gallery
CREATE INDEX IF NOT EXISTS idx_media_type_active
    ON media(type, active);

-- services.active: catalog queries use WHERE active = true
CREATE INDEX IF NOT EXISTS idx_services_active
    ON services(active) WHERE active = true;

-- services.category + active: browse-by-category is the primary public use case
CREATE INDEX IF NOT EXISTS idx_services_category_active
    ON services(category, active);
