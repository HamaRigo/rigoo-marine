-- Attachments for service history entries — receipts, photos of parts,
-- inspection certificates, etc. Pointer-only: the bytes live in
-- client-module's media storage (existing /api/clients/upload pipeline);
-- we just hold the URL + the minimum metadata needed to render a
-- thumbnail and surface it in the dossier.
--
-- ON DELETE CASCADE on service_history_id — when a history row is
-- removed (manual delete or admin cleanup), its attachments go with it.
-- The underlying files in client-module are NOT cleaned up by this
-- cascade; an orphan-cleanup job is a separate task documented in the
-- service layer.

CREATE TABLE IF NOT EXISTS service_history_attachments (
    id                BIGSERIAL PRIMARY KEY,
    service_history_id BIGINT NOT NULL REFERENCES service_history(id) ON DELETE CASCADE,
    client_id         BIGINT NOT NULL,
    url               VARCHAR(1024) NOT NULL,
    filename          VARCHAR(255),
    content_type      VARCHAR(100) NOT NULL,
    size_bytes        BIGINT NOT NULL,
    uploaded_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_attachment_size_positive CHECK (size_bytes > 0),
    CONSTRAINT ck_attachment_size_under_10mb CHECK (size_bytes <= 10485760)
);

-- Hot path: dossier read does "all attachments for these N history rows"
-- in a single IN-clause. Index on service_history_id makes that an index
-- scan instead of a heap scan.
CREATE INDEX IF NOT EXISTS idx_attachments_history
    ON service_history_attachments(service_history_id);

-- Cheap count check for the "max 10 per record" guard in the service layer.
-- Same index covers it via index-only scan.

COMMENT ON TABLE service_history_attachments IS
    'Pointer metadata for files attached to service-history entries. Files themselves live in client-module storage.';
COMMENT ON COLUMN service_history_attachments.url IS
    'Opaque URL into client-module storage. We never validate origin — pointer-only.';
