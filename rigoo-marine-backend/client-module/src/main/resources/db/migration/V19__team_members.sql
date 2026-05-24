CREATE TABLE team_members (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    name_ar       VARCHAR(255),
    role          VARCHAR(255) NOT NULL,
    role_ar       VARCHAR(255),
    bio           TEXT,
    bio_ar        TEXT,
    photo_url     TEXT,
    department    VARCHAR(100) NOT NULL DEFAULT 'general',
    linkedin_url  VARCHAR(500),
    email         VARCHAR(255),
    display_order INT          NOT NULL DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_active ON team_members(active);
CREATE INDEX idx_team_dept   ON team_members(department);
CREATE INDEX idx_team_order  ON team_members(display_order ASC);
