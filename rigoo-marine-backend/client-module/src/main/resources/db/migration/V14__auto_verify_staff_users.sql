-- Auto-verify staff accounts (ADMIN, TEAM_LEAD, TECHNICIAN, DELIVERY).
-- These are created by admins directly, not via self-registration,
-- so they do not need email verification to access the platform.
UPDATE clients
SET email_verified = TRUE
WHERE role IN ('ADMIN', 'TEAM_LEAD', 'TECHNICIAN', 'DELIVERY')
  AND email_verified = FALSE;
