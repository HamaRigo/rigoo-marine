-- Shop module Phase 2: cart + orders + checkout.
-- Adds optimistic locking on products (prevents oversold stock under concurrent
-- webhook retries) and the cart/order schema needed for Stripe Checkout.

-- ---------- products: optimistic-lock version ----------

ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- ---------- carts ----------

CREATE TABLE IF NOT EXISTS carts (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL UNIQUE,       -- one active cart per user; JWT subject (email)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carts_user_email ON carts(user_email);

CREATE TABLE IF NOT EXISTS cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_cart_items_cart_product UNIQUE (cart_id, product_id),
    CONSTRAINT ck_cart_items_qty_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- ---------- orders ----------
-- Snapshot pattern: order_items capture name/price/image at order time so
-- historical orders survive product mutations.

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE,      -- RGM-YYYY-NNNNN, customer-facing
    user_email VARCHAR(255) NOT NULL,              -- JWT subject; primary user identifier in v1

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_PAYMENT',
    -- PENDING_PAYMENT | PAID | CANCELLED | REFUNDED

    subtotal_qar DECIMAL(12,2) NOT NULL,
    tax_qar DECIMAL(12,2) NOT NULL DEFAULT 0,      -- locked at 0 for v1 (Qatar VAT not enforced)
    total_qar DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'QAR',

    -- Stripe linkage (nullable until checkout session created)
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),

    notes TEXT,                                    -- free-form, used for phone-follow-up fulfillment

    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_orders_status CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED')),
    CONSTRAINT ck_orders_total_nonneg CHECK (total_qar >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),  -- no CASCADE — preserve history

    -- Snapshot at order time
    sku VARCHAR(100) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    price_qar DECIMAL(12,2) NOT NULL,
    image_url TEXT,
    quantity INTEGER NOT NULL,
    line_total_qar DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_order_items_qty_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
