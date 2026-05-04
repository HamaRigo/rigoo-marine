-- Task #6: email verification + password reset.
-- Numbered V3 because work-order-module's V2 already exists in the shared Flyway history.

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Grandfather existing accounts: anyone already created is treated as verified.
UPDATE clients SET email_verified = TRUE WHERE email_verified = FALSE;
UPDATE clients SET password_changed_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE password_changed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_email_verification_token_hash
    ON clients(email_verification_token_hash);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_client_id ON password_reset_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Bilingual email template support (PLAN.md backend i18n requirement).
ALTER TABLE email_templates
    ADD COLUMN IF NOT EXISTS subject_ar VARCHAR(255),
    ADD COLUMN IF NOT EXISTS body_ar TEXT;

-- Seed verify + reset templates. Body uses {{name}} and {{link}} placeholders.
INSERT INTO email_templates (name, subject, body, subject_ar, body_ar, type, active) VALUES
('EMAIL_VERIFY',
 'Verify your Rigoo Marine email',
 'Hi {{name}},

Tap the link below within 24 hours to verify your email:
{{link}}

If you did not create an account, you can ignore this message.

— Rigoo Marine',
 'تأكيد بريدك الإلكتروني — Rigoo Marine',
 'مرحبًا {{name}}،

اضغط الرابط أدناه خلال 24 ساعة لتأكيد بريدك الإلكتروني:
{{link}}

إذا لم تنشئ حسابًا، يمكنك تجاهل هذه الرسالة.

— فريق Rigoo Marine',
 'AUTH', TRUE),
('PASSWORD_RESET',
 'Reset your Rigoo Marine password',
 'Hi {{name}},

We received a password reset request. Tap the link below within 15 minutes to set a new password:
{{link}}

If you did not request a reset, you can ignore this message — your password will not change.

— Rigoo Marine',
 'إعادة تعيين كلمة المرور — Rigoo Marine',
 'مرحبًا {{name}}،

تلقّينا طلب إعادة تعيين كلمة المرور. اضغط الرابط أدناه خلال 15 دقيقة لتعيين كلمة مرور جديدة:
{{link}}

إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة — لن تتغيّر كلمة مرورك.

— فريق Rigoo Marine',
 'AUTH', TRUE)
ON CONFLICT DO NOTHING;
