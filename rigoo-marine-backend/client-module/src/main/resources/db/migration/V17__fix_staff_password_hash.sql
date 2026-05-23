-- V17: fix the staff seed accounts whose passwords were unverifiable due to a
--      bad pre-computed hash in V16.  We re-hash at migration time using
--      pgcrypto so the result is always correct, regardless of how the hash
--      was originally generated.
--
-- Staff account passwords after this migration:
--   fakhri1@gmail.com          (TEAM_LEAD)   → Rigoo2024!
--   hama.rigo@gmail.com        (TECHNICIAN)  → Rigoo2024!
--   mohamed.bouallagui@gmail.com (ADMIN)     → Admin2024!  (created here)

UPDATE clients
SET password   = crypt('Rigoo2024!', gen_salt('bf', 10)),
    updated_at = NOW()
WHERE email = 'fakhri1@gmail.com';

UPDATE clients
SET password   = crypt('Rigoo2024!', gen_salt('bf', 10)),
    updated_at = NOW()
WHERE email = 'hama.rigo@gmail.com';

INSERT INTO clients (name, email, phone, password, role,
                     email_verified, unsubscribe_token,
                     created_at, updated_at, preferred_language)
VALUES ('Mohamed Bouallagui', 'mohamed.bouallagui@gmail.com',
        '+97412345678',
        crypt('Admin2024!', gen_salt('bf', 10)),
        'ADMIN', true,
        encode(gen_random_bytes(32), 'hex'),
        NOW(), NOW(), 'en')
ON CONFLICT (email) DO UPDATE
    SET password       = crypt('Admin2024!', gen_salt('bf', 10)),
        role           = 'ADMIN',
        email_verified = true,
        updated_at     = NOW();
