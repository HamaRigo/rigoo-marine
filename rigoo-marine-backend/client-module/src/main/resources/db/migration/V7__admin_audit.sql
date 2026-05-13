-- Audit trail for sensitive admin actions: password resets, role changes,
-- user deletes. Append-only; never modified once written. Read path is the
-- ops dashboard ("show me the last 100 admin actions" / "filter by action").

CREATE TABLE IF NOT EXISTS admin_audit (
    id            BIGSERIAL PRIMARY KEY,
    actor_email   VARCHAR(320) NOT NULL,
    actor_id      BIGINT,
    action        VARCHAR(64) NOT NULL,
    target_type   VARCHAR(32) NOT NULL,
    target_id     BIGINT,
    details       TEXT,
    ip_address    VARCHAR(64),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hot paths: dashboard list-recent, filter-by-action.
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
    ON admin_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action_created
    ON admin_audit(action, created_at DESC);

-- Per-target lookup ("everything that has happened to user 17").
CREATE INDEX IF NOT EXISTS idx_admin_audit_target
    ON admin_audit(target_type, target_id);

COMMENT ON TABLE admin_audit IS 'Append-only audit trail for sensitive admin actions. Never modified after insert.';
COMMENT ON COLUMN admin_audit.action IS 'PASSWORD_RESET | ROLE_CHANGE | USER_DELETE | (future).';
COMMENT ON COLUMN admin_audit.target_type IS 'USER for now; reserved for future expansion.';
COMMENT ON COLUMN admin_audit.details IS 'Free-form JSON for action-specific context (e.g., {"oldRole":"CLIENT","newRole":"TECHNICIAN"}).';
