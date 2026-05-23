-- Seed staff demo accounts with known passwords so the stack is usable
-- after a fresh DB wipe without manual intervention.
--
-- Password for both accounts:  Rigoo2024!
-- BCrypt hash (cost 10):  $2b$10$mJ1hW0bYBPC68ELD65UbRufPZb7E1binZQF9cwdJp2K.fqtu2FMMa
--
-- Uses INSERT … ON CONFLICT (email) DO UPDATE so:
--   - First run on a fresh DB: creates the accounts.
--   - Subsequent runs / restarts: only resets the password + role, leaving
--     all other fields intact (phone, name, etc).

DO $$
DECLARE
  pwd TEXT := '$2b$10$mJ1hW0bYBPC68ELD65UbRufPZb7E1binZQF9cwdJp2K.fqtu2FMMa';
BEGIN
  -- Team Lead
  INSERT INTO clients (name, email, phone, password, role,
                       email_verified, unsubscribe_token,
                       created_at, updated_at)
  VALUES ('fakhri', 'fakhri1@gmail.com', '+97470970917', pwd,
          'TEAM_LEAD', true,
          encode(gen_random_bytes(32), 'hex'),
          NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
    SET password       = EXCLUDED.password,
        role           = EXCLUDED.role,
        email_verified = true,
        updated_at     = NOW();

  -- Technician
  INSERT INTO clients (name, email, phone, password, role,
                       email_verified, unsubscribe_token,
                       created_at, updated_at)
  VALUES ('hama.rigo', 'hama.rigo@gmail.com', '+97471715478', pwd,
          'TECHNICIAN', true,
          encode(gen_random_bytes(32), 'hex'),
          NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
    SET password       = EXCLUDED.password,
        role           = EXCLUDED.role,
        email_verified = true,
        updated_at     = NOW();
END $$;
