-- Seed the primary admin account.
-- Uses ON CONFLICT so re-running (e.g. after a DB wipe) is idempotent.

DO $$
DECLARE
  pwd TEXT := '$2b$12$EAgEzQV9q11VYJINrGzY4uV0BADmAcIsBCvN032t.sHsoO.GXD3Ki';
BEGIN
  INSERT INTO clients (name, email, phone, password, role,
                       email_verified, unsubscribe_token,
                       created_at, updated_at)
  VALUES ('Mohamed Bouallagui',
          'mohamed.bouallagui001@gmail.com',
          '+97477704703',
          pwd,
          'ADMIN',
          true,
          encode(gen_random_bytes(32), 'hex'),
          NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
    SET password       = EXCLUDED.password,
        role           = EXCLUDED.role,
        phone          = EXCLUDED.phone,
        email_verified = true,
        updated_at     = NOW();
END $$;
