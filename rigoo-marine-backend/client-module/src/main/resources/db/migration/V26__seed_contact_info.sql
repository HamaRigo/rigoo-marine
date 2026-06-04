-- Seed initial contact info for Rigoo Marine Qatar.
-- These 7 keys are consumed by:
--   Footer.jsx          → email_general, phone_primary
--   Home.jsx            → email_general, phone_primary
--   admin/Settings.jsx  → all 7 (company_name, email_general, phone_primary,
--                                 address, city, country, website)
--
-- ON CONFLICT (key_name) DO NOTHING makes the migration idempotent so a
-- re-run (e.g. after a DB wipe + restore) never duplicates rows.

INSERT INTO contact_info (key_name, value, category, display_order, active, created_at, updated_at) VALUES
('company_name',  'Rigoo Marine',                    'general',  1, TRUE, NOW(), NOW()),
('email_general', 'rigoomarine@gmail.com',            'email',    2, TRUE, NOW(), NOW()),
('phone_primary', '+97470970917',                     'phone',    3, TRUE, NOW(), NOW()),
('address',       'Industrial Area, Street 43',       'location', 4, TRUE, NOW(), NOW()),
('city',          'Doha',                             'location', 5, TRUE, NOW(), NOW()),
('country',       'Qatar',                            'location', 6, TRUE, NOW(), NOW()),
('website',       'https://rigoomarine.com',          'general',  7, TRUE, NOW(), NOW())
ON CONFLICT (key_name) DO NOTHING;
