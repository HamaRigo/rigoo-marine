-- Marketplace module schema (PLAN.md §3 Phase 1).
-- Comprehensive listing fields modelled from day 1; transactional flows (reservations,
-- rental bookings, availability calendar) are Phase 2 and not included here.

CREATE TABLE IF NOT EXISTS boat_listings (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status + ownership
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    seller_type VARCHAR(20) NOT NULL DEFAULT 'DEALER',
    created_by BIGINT,
    listing_id_external VARCHAR(50) UNIQUE,

    -- Mode flags + pricing (the same listing can be both for_sale and for_rent)
    for_sale BOOLEAN NOT NULL DEFAULT FALSE,
    sale_price DECIMAL(12,2),
    for_rent BOOLEAN NOT NULL DEFAULT FALSE,
    daily_rate DECIMAL(12,2),
    weekly_rate DECIMAL(12,2),
    min_rental_nights INTEGER,
    max_rental_nights INTEGER,
    cleaning_fee DECIMAL(12,2),
    rental_security_deposit DECIMAL(12,2),
    captain_required VARCHAR(20),
    captain_daily_fee DECIMAL(12,2),

    -- Currency (Qatar locked to QAR for v1)
    currency VARCHAR(3) NOT NULL DEFAULT 'QAR',

    -- Vessel specs
    boat_type VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    year_built INTEGER,
    length_meters DECIMAL(6,2),
    beam_meters DECIMAL(6,2),
    draft_meters DECIMAL(6,2),
    displacement_kg DECIMAL(10,2),
    hull_material VARCHAR(50),
    fuel_capacity_liters DECIMAL(8,2),
    water_capacity_liters DECIMAL(8,2),
    sleeping_berths INTEGER,

    -- Engine + systems
    engine_make VARCHAR(100),
    engine_model VARCHAR(100),
    engine_hours INTEGER,
    fuel_type VARCHAR(50),
    has_generator BOOLEAN DEFAULT FALSE,
    has_gps BOOLEAN DEFAULT FALSE,
    has_radar BOOLEAN DEFAULT FALSE,
    has_autopilot BOOLEAN DEFAULT FALSE,
    has_ais BOOLEAN DEFAULT FALSE,
    has_air_conditioning BOOLEAN DEFAULT FALSE,
    has_heating BOOLEAN DEFAULT FALSE,
    has_watermaker BOOLEAN DEFAULT FALSE,
    has_solar BOOLEAN DEFAULT FALSE,
    battery_count INTEGER,

    -- Condition
    last_survey_date DATE,
    last_antifoul_date DATE,
    last_engine_service_date DATE,
    known_issues TEXT,
    inclusions TEXT,

    -- Location
    location_text VARCHAR(255),
    location_marina VARCHAR(255),
    location_city VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Qatar',
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),

    -- Documents + pricing context
    registration_country VARCHAR(100),
    ownership_status VARCHAR(100),
    lien_free BOOLEAN,
    spec_sheet_url TEXT,
    financing_notes TEXT,
    vat_status VARCHAR(100),

    -- Media (photos + video URLs as JSON arrays — keeps it simple, frontend renders)
    media_urls TEXT,
    video_url TEXT,

    -- Trust signals
    seller_verified BOOLEAN DEFAULT FALSE,
    view_count BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boat_listings_status ON boat_listings(status);
CREATE INDEX IF NOT EXISTS idx_boat_listings_for_sale ON boat_listings(for_sale) WHERE for_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_boat_listings_for_rent ON boat_listings(for_rent) WHERE for_rent = TRUE;
CREATE INDEX IF NOT EXISTS idx_boat_listings_boat_type ON boat_listings(boat_type);

CREATE TABLE IF NOT EXISTS boat_inquiries (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES boat_listings(id) ON DELETE CASCADE,
    user_id BIGINT,                              -- nullable for guest submissions
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    inquiry_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',  -- BUY | RENT | INSPECTION | GENERAL
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',            -- NEW | IN_PROGRESS | CLOSED
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boat_inquiries_listing_id ON boat_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_boat_inquiries_status ON boat_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_boat_inquiries_user_id ON boat_inquiries(user_id);
