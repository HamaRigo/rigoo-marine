-- WhatsApp opt-in flag. Qatar uses WhatsApp heavily — extending the existing
-- Twilio integration (already used for SMS OTP login) gives us a low-friction
-- third channel for maintenance reminders.
--
-- Default FALSE: explicit opt-in only. Existing users see the toggle in their
-- profile; new users start opted out.

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN clients.whatsapp_opt_in IS
    'Explicit opt-in for WhatsApp reminders. When TRUE and a phone is on file, ServiceDueEventConsumer fires a WhatsApp message in addition to the email + in-app notification.';
