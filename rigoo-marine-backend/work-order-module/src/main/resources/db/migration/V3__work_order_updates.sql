-- Timeline of updates posted on a work order by any actor
-- (technician, team lead, admin, or client).
-- visible_to_client=false entries are internal notes not exposed to the client.

CREATE TABLE work_order_updates (
    id                BIGSERIAL    PRIMARY KEY,
    work_order_id     BIGINT       NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    author_id         BIGINT       NOT NULL,
    author_role       VARCHAR(20)  NOT NULL,
    message           TEXT         NOT NULL,
    visible_to_client BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wo_updates_order ON work_order_updates(work_order_id, created_at DESC);
