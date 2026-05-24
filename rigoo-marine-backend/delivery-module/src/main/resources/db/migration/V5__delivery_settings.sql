CREATE TABLE IF NOT EXISTS delivery_settings (
    id          BIGINT PRIMARY KEY DEFAULT 1,
    history_days INT    NOT NULL DEFAULT 7,
    CHECK (id = 1)
);

INSERT INTO delivery_settings (id, history_days)
VALUES (1, 7)
ON CONFLICT (id) DO NOTHING;
