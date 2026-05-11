-- One-time SMS verification codes for OTP login. Hash at rest (SHA-256 hex)
-- so a DB leak doesn't reveal usable codes. Single-use enforced via used_at.

CREATE TABLE IF NOT EXISTS phone_otp_codes (
    id            BIGSERIAL PRIMARY KEY,
    phone         VARCHAR(20) NOT NULL,
    code_hash     VARCHAR(64) NOT NULL,
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_attempts  INTEGER NOT NULL DEFAULT 5,
    expires_at    TIMESTAMP NOT NULL,
    used_at       TIMESTAMP,
    locale        VARCHAR(8),
    ip_address    VARCHAR(64),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hot path for verify(): "the latest unused, unexpired entry for this phone".
CREATE INDEX IF NOT EXISTS idx_phone_otp_active
    ON phone_otp_codes(phone, used_at, expires_at);

-- Hot path for the invalidation step in request() — mark prior codes used.
CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_used
    ON phone_otp_codes(phone) WHERE used_at IS NULL;

COMMENT ON TABLE phone_otp_codes IS 'SMS OTP login codes. Hashed at rest. Single-use via used_at; bounded retries via attempts/max_attempts.';
COMMENT ON COLUMN phone_otp_codes.code_hash IS 'SHA-256 hex of the 6-digit code.';
COMMENT ON COLUMN phone_otp_codes.used_at IS 'NULL = still usable. Stamped on first successful verify OR when invalidated by a newer request.';
