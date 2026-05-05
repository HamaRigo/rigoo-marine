-- Shop module schema (PLAN.md §2 Phase 1).
-- Catalog browse + admin CRUD + product inquiries. Cart + Order + Stripe checkout
-- are Phase 2 (blocked on Stripe creds + S3); not included here.
--
-- Bilingual content (AR + EN) is baked in from day 1 — we are not repeating the
-- migration churn that hit boat_listings (#11 V2). Single-locale columns omitted.

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,

    -- Bilingual content
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_en TEXT,
    description_ar TEXT,

    -- Classification
    category VARCHAR(20) NOT NULL DEFAULT 'PART',  -- PART | TOOL
    brand VARCHAR(100),

    -- Pricing (single base currency: QAR — locked decision)
    price_qar DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'QAR',

    -- Stock
    stock_qty INTEGER NOT NULL DEFAULT 0,

    -- Status (DRAFT hidden from public; ACTIVE shown; ARCHIVED soft-deleted)
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    -- Media: pasted hosted URLs for now (one per line in admin form, JSON array on disk).
    -- S3 + thumbnail pipeline is Phase 2.
    media_urls TEXT,

    -- Free-form bilingual specs (engine compatibility, dimensions, weight, etc.)
    specs_en TEXT,
    specs_ar TEXT,

    created_by BIGINT,
    view_count BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_products_category CHECK (category IN ('PART', 'TOOL')),
    CONSTRAINT ck_products_status CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    CONSTRAINT ck_products_price_nonneg CHECK (price_qar >= 0),
    CONSTRAINT ck_products_stock_nonneg CHECK (stock_qty >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
-- Partial index for the common public query path (status='ACTIVE' AND category=...).
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(category) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS product_inquiries (
    id BIGSERIAL PRIMARY KEY,
    -- Nullable: GENERAL inquiries (homepage Contact-us-from-shop) need not reference a product.
    -- DB-level CHECK enforces that QUOTE/STOCK_CHECK require a product_id.
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    user_id BIGINT,                               -- nullable for guest submissions
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    quantity INTEGER,                             -- optional — relevant for QUOTE
    inquiry_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',  -- QUOTE | STOCK_CHECK | GENERAL
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',            -- NEW | IN_PROGRESS | CLOSED
    admin_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_product_inquiries_type
        CHECK (inquiry_type IN ('QUOTE', 'STOCK_CHECK', 'GENERAL')),
    CONSTRAINT ck_product_inquiries_status
        CHECK (status IN ('NEW', 'IN_PROGRESS', 'CLOSED')),
    -- Product-bound inquiry types must reference a product; GENERAL may or may not.
    CONSTRAINT ck_product_inquiries_product_required
        CHECK (
            (inquiry_type IN ('QUOTE', 'STOCK_CHECK') AND product_id IS NOT NULL)
            OR inquiry_type = 'GENERAL'
        )
);

CREATE INDEX IF NOT EXISTS idx_product_inquiries_product_id ON product_inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_status ON product_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_user_id ON product_inquiries(user_id);
