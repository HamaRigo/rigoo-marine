-- Allow team requests to be assigned to a specific team lead or technician.
-- assigned_to references clients.id (the assignee's account).
-- assigned_at is set when the assignment is made.

ALTER TABLE team_requests
    ADD COLUMN assigned_to BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    ADD COLUMN assigned_at TIMESTAMP;

CREATE INDEX idx_team_req_assigned ON team_requests(assigned_to) WHERE assigned_to IS NOT NULL;
