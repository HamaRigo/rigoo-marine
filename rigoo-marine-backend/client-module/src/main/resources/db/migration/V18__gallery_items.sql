CREATE TABLE gallery_items (
    id             BIGSERIAL    PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    title_ar       VARCHAR(255),
    description    TEXT,
    description_ar TEXT,
    category       VARCHAR(100) NOT NULL DEFAULT 'general',
    before_url     TEXT         NOT NULL,
    after_url      TEXT         NOT NULL,
    display_order  INT          NOT NULL DEFAULT 0,
    published      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_published   ON gallery_items(published);
CREATE INDEX idx_gallery_category    ON gallery_items(category);
CREATE INDEX idx_gallery_order       ON gallery_items(display_order ASC);
