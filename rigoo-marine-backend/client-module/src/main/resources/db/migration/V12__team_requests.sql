-- On-site service team requests submitted by clients or guests.

CREATE TABLE IF NOT EXISTS team_requests (
    id                   BIGSERIAL PRIMARY KEY,
    client_id            BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    contact_phone        VARCHAR(20),
    category             VARCHAR(50)  NOT NULL,
    description          TEXT         NOT NULL,
    location_description TEXT,
    whatsapp_opt_in      BOOLEAN      NOT NULL DEFAULT FALSE,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    admin_notes          TEXT,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_request_attachments (
    id            BIGSERIAL PRIMARY KEY,
    request_id    BIGINT       NOT NULL REFERENCES team_requests(id) ON DELETE CASCADE,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255),
    content_type  VARCHAR(100),
    file_size     BIGINT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_req_status     ON team_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_req_client     ON team_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_team_req_created_at ON team_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_req_phone      ON team_requests(contact_phone) WHERE status = 'PENDING';

COMMENT ON TABLE team_requests            IS 'On-site team dispatch requests from clients or guests.';
COMMENT ON TABLE team_request_attachments IS 'Photos and videos uploaded with a team request.';
