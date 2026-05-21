-- Vessel document vault: registration papers, insurance certificates,
-- survey reports, classification certificates, etc.
-- Files are stored externally (CDN/S3); this table holds metadata + URL pointer.
-- Cascades DELETE with the parent vessel.

CREATE TABLE IF NOT EXISTS vessel_documents (
    id            BIGSERIAL    PRIMARY KEY,
    vessel_id     BIGINT       NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    client_id     BIGINT       NOT NULL,
    document_type VARCHAR(30)  NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    url           VARCHAR(1024) NOT NULL,
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    issue_date    DATE,
    expiry_date   DATE,
    notes         VARCHAR(500),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_doc_file_size CHECK (file_size IS NULL OR file_size > 0),
    CONSTRAINT chk_doc_expiry_after_issue
        CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

-- Fast lookup by vessel (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_vessel_docs_vessel
    ON vessel_documents (vessel_id, created_at DESC);

-- Expiry sweep for upcoming-expiry alerts (only rows that have an expiry)
CREATE INDEX IF NOT EXISTS idx_vessel_docs_expiry
    ON vessel_documents (expiry_date)
    WHERE expiry_date IS NOT NULL;

-- Ownership filter (used by admin cross-client views)
CREATE INDEX IF NOT EXISTS idx_vessel_docs_client
    ON vessel_documents (client_id);
