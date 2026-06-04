-- The Client entity declares @Column(unique=true) on phone but V1 omitted the
-- DB-level constraint, leaving the application-level existsByPhone check with no
-- safety net.  Adding the unique index here:
--   1. Closes the race-condition window where two concurrent requests could insert
--      the same phone (both pass existsByPhone, one fails with an unhandled
--      DataIntegrityViolationException → 500).
--   2. Aligns the schema with the entity definition so ddl-auto:validate stays clean.
--
-- If this migration fails, there are already duplicate phone values in the DB.
-- Before re-running, find and resolve them with:
--   SELECT phone, COUNT(*), array_agg(id ORDER BY created_at) AS ids
--     FROM clients GROUP BY phone HAVING COUNT(*) > 1;
-- then DELETE the newer duplicate rows (keep the oldest).

CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_phone ON clients(phone);

COMMENT ON INDEX ux_clients_phone IS
    'Unique constraint backing Client.@Column(unique=true) on phone. Prevents duplicate registrations at DB level.';
