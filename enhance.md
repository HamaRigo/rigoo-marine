# Rigoo Marine — Enhancement Roadmap

> **Scope**: Pending and planned work only. Completed items removed.
> **Legend**: `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE

---

## TRACK 1 — Carry-over: Unfinished items from previous sessions

### A1 — Arabic font in the maintenance PDF renderer `[ ]`
**What**: `locale=ar` emits Arabic labels but body text renders as boxes (Helvetica has no Arabic glyphs).
Use a configurable font path; do not bundle a binary.
**Files**:
- `maintenance-module/.../service/MaintenanceDossierPdfRenderer.java` — load font from config path
- `maintenance-module/src/main/resources/application.yml` — add `app.maintenance.pdf.arabic-font-path`

### A2 — Vessel name on the maintenance PDF header `[ ]`
**What**: PDF header shows `#42` instead of `"Al Bahar"`.
**Files**:
- `vessel-module/.../controller/InternalVesselController.java` — `GET /api/internal/vessels/{id}/name`
- `maintenance-module/.../client/VesselClient.java` — `getVesselName(id)`
- `maintenance-module/.../controller/VesselMaintenanceController.java` — wire into PDF generation

### A3 — Bilingual in-app notification text `[ ]`
**What**: `ServiceDueEventConsumer` still builds the in-app `Notification` row text in hard-coded English despite `preferred_language` being available.
**Files**: `notification-module/.../kafka/ServiceDueEventConsumer.java`

### A4 — Remove dead notification stub `[ ]`
**What**: `NotificationService.processWorkOrderEvent` is an unreferenced stub.
**Files**: `notification-module/.../service/NotificationService.java`

### A5 — Pagination on admin maintenance dashboard `[ ]`
**What**: Returns every overdue + due-soon row. Fine now, brittle at scale.
**Files**:
- `maintenance-module/.../service/AdminMaintenanceService.java` — return `Page<>`
- `maintenance-module/.../controller/MaintenanceAdminController.java` — accept `Pageable`
- `pages/admin/MaintenanceDashboard.jsx` — add `<Pagination>` control

### A6 — Audit log for admin maintenance operations `[ ]`
**What**: Admin schedule edits / snoozes / history deletes do not write `admin_audit` rows.
**Files**:
- `maintenance-module/.../service/MaintenanceAuditLogger.java` (new)
- `ServiceScheduleService` + `ServiceHistoryService` — write audit row on admin-actor mutations

### B1 — Notification idempotency `[ ]`
**What**: Kafka redelivery of `ServiceDueEvent` creates duplicate in-app rows and emails. Need Redis SETNX dedupe.
**Files**:
- `notification-module/.../kafka/EventDedupe.java` (new) — `firstTime(eventId)` via Redis SETNX
- `ServiceDueEventConsumer` + `WorkOrderCompletedEventConsumer` — bail early when `firstTime` is false

### B2 — "Book now" CTA on overdue service reminders `[ ]`
**What**: Highest-leverage revenue item. Email tells users to log in; make it one click to a pre-filled service request.
**Files**:
- `ServiceDueEventConsumer` — include `actionUrl` in the notification payload
- `notification-module/.../entity/Notification.java` + migration — `action_url` column
- `Notifications.jsx` + `NotificationBell.jsx` — render "Book now" button when `actionUrl` is set
- `ServiceRequest.jsx` — pre-fill vessel + service type from query params

### B3 — Service catalog wired into Add-Reminder dialog `[ ]`
**What**: Schedule reminder dropdown is hard-coded. The service-module catalog has names, descriptions, and prices.
**Files**:
- `EditScheduleDialog.jsx` — fetch `/api/services` on open; show name + price per type
- Add `DEFAULT_INTERVALS` mapping helper (OIL_CHANGE → 180d/100h, ANTIFOULING → 365d, …)

---

## TRACK 2 — Role System Expansion

### Overview of new roles

| Role | Level | Short description |
|---|---|---|
| `CLIENT` | 1 | Vessel owner — existing, unchanged |
| `TECHNICIAN` | 2 | Field worker — existing, extended (see §2.1) |
| `TEAM_LEAD` | 3 | Field supervisor — new role (see §2.2) |
| `DELIVERY` | 4 | Logistics / delivery driver — new role (see §2.3) |
| `ADMIN` | 5 | Platform operator — existing, unchanged |

---

### 2.0 — Role enum + security foundations `[x]`

**Backend**

- Add `TEAM_LEAD` and `DELIVERY` to `UserRole` enum in `client-module/.../entity/Client.java`
- Update all `SecurityConfig` files:
  - `/team-lead/**` → permit `TEAM_LEAD | ADMIN`
  - `/delivery/**` → permit `DELIVERY | ADMIN`
  - `TEAM_LEAD` granted same vessel read access as `ADMIN` in `vessel-module` and `maintenance-module`
- Gateway `application.yml`:
  - Add route `/team-lead/**` → `lb://technician-service`
  - Add route `/api/delivery/**` → `lb://delivery-service`

**DB migrations (client-module)**

- `V13__team_request_assignment.sql`
  ```sql
  ALTER TABLE team_requests ADD COLUMN assigned_to  BIGINT REFERENCES clients(id) ON DELETE SET NULL;
  ALTER TABLE team_requests ADD COLUMN assigned_at  TIMESTAMP;
  ```

**DB migrations (work-order-module)**

- `V_WO_1__work_order_updates.sql`
  ```sql
  CREATE TABLE work_order_updates (
    id                BIGSERIAL PRIMARY KEY,
    work_order_id     BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    author_id         BIGINT NOT NULL,
    author_role       VARCHAR(20) NOT NULL,
    message           TEXT NOT NULL,
    visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ```
- `V_WO_2__work_order_attachments.sql`
  ```sql
  CREATE TABLE work_order_attachments (
    id            BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    uploaded_by   BIGINT NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255),
    content_type  VARCHAR(100),
    file_size     BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ```

**Frontend**

- Add `isTeamLead`, `isDelivery` booleans to `AuthContext`
- Add `<TeamLeadRoute>` and `<DeliveryRoute>` guard components alongside existing `<AdminRoute>` / `<TechnicianRoute>`
- `Navbar.jsx` — `UserMenu` chip navigates:
  - `TEAM_LEAD` → `/team-lead`
  - `DELIVERY` → `/delivery`

---

### 2.1 — Enhanced Technician `[x]`

**New capabilities over current scope:**

| Capability | Backend endpoint | Notes |
|---|---|---|
| Upload photo / file attachments to a work order | `POST /api/work-orders/{id}/attachments` | Multipart, stored in `work_order_attachments` |
| View full vessel maintenance dossier for assigned vessels | `GET /api/maintenance/vessels/{vesselId}/dossier` | Accessible only when vessel is on one of their assigned orders |
| Flag order as WAITING_PARTS | `PATCH /api/work-orders/{id}/status` with `WAITING_PARTS` + `reason` | Already in `WorkOrderStatus`; previously blocked to technician |
| Post a client-visible update on a job | `POST /api/work-orders/{id}/updates` | `visible_to_client=true` triggers notification |
| Respond to an assigned team request | `PATCH /api/team-requests/{id}/status` | Scope-guarded: only requests assigned to them |

**Frontend additions (technician dashboard)**

- Work order detail page:
  - Attachment upload zone (drag & drop, max 5 × 20 MB, images + videos)
  - "Post Update" form — text field + optional photo, preview of what client sees
  - "Flag as Waiting Parts" button → reason text field → confirm
- Work order list: show `WAITING_PARTS` badge

---

### 2.2 — Team Lead `[ ]`

**Responsibilities**: field supervisor. Manages technicians, handles client-facing job communication, generates billing documents for jobs under their supervision. No access to platform admin (users, audit log, settings, marketing).

#### 2.2.1 — Backend

**Work-order-module**

- `TEAM_LEAD` gets `ADMIN`-equivalent access on:
  - `GET /api/work-orders` (all orders, not just assigned)
  - `PATCH /api/work-orders/{id}/assign` — assign/reassign technician
  - `PATCH /api/work-orders/{id}/approve` — approve from field
  - `PATCH /api/work-orders/{id}/complete` — sign off on completion
  - `POST /api/work-orders/{id}/updates` — post client-visible updates

**Invoice-module** — scope-restricted TEAM_LEAD access

- `POST /api/invoices` — allowed only if `work_order.assignedTechnicianId` maps back to a technician under this team lead, or the order is directly assigned to them; controller enforces ownership check
- `POST /api/quotations` — same ownership guard
- `GET /api/invoices?myJobs=true` — filter to their supervised jobs only

**Client-module (team requests)**

- `PATCH /api/admin/team-requests/{id}/assign` — assign request to a technician
- `PATCH /api/admin/team-requests/{id}/status` — update status + add note
- `GET /api/admin/team-requests` — accessible to `TEAM_LEAD | ADMIN`

**Maintenance-module**

- `GET /api/maintenance/vessels/{vesselId}/dossier` — readable by `TEAM_LEAD` for any vessel (read-only, no schedule edits)

#### 2.2.2 — Frontend `/team-lead`

```
/team-lead                      → Dashboard: today's jobs, pending approvals, open team requests
/team-lead/orders               → Full job board (all work orders, filterable by status / technician)
/team-lead/orders/:id           → Order detail: full timeline, assign technician, post update, approve/complete
/team-lead/team-requests        → Incoming on-site requests: assign, schedule, update status
/team-lead/invoices             → Create / view invoices for supervised jobs
/team-lead/quotations           → Create / send quotations to clients
/team-lead/history              → Completed jobs history (filterable by date, technician, vessel)
/team-lead/technicians          → Roster: availability, active assignments per technician
```

---

### 2.3 — Delivery Technician `[ ]`

**Responsibilities**: picks up shop-order products and work-order parts from variable supplier / warehouse locations and delivers them to client addresses. Has a daily stop list with map visualization and live GPS tracking visible to Admin and Team Lead.

#### 2.3.1 — New microservice: `delivery-module` (port 8089)

**DB schema**

```sql
-- V1__delivery_tasks.sql
CREATE TABLE delivery_tasks (
  id                BIGSERIAL PRIMARY KEY,
  type              VARCHAR(20)  NOT NULL,   -- SHOP_ORDER | WORK_ORDER_PARTS
  reference_id      BIGINT       NOT NULL,   -- shop_order.id or work_order.id
  assigned_to       BIGINT,                  -- delivery tech (clients.id)
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  -- PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED | FAILED

  pickup_label      VARCHAR(255),            -- "Main Warehouse" / "Al Jaber Auto"
  pickup_address    TEXT,
  pickup_lat        DECIMAL(9,6),
  pickup_lng        DECIMAL(9,6),

  delivery_address  TEXT         NOT NULL,
  delivery_lat      DECIMAL(9,6),
  delivery_lng      DECIMAL(9,6),

  client_phone      VARCHAR(20),
  invoice_id        BIGINT,
  invoice_amount    DECIMAL(10,2),
  currency          VARCHAR(5)   DEFAULT 'QAR',

  scheduled_date    DATE         NOT NULL,
  stop_order        INTEGER,                 -- position in the day's optimized route
  notes             TEXT,
  proof_photo_path  VARCHAR(500),
  delivered_at      TIMESTAMP,
  failed_reason     TEXT,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_delivery_task_date   ON delivery_tasks(scheduled_date, assigned_to);
CREATE INDEX idx_delivery_task_status ON delivery_tasks(status);

-- V2__delivery_position_log.sql
-- Redis is primary store (key: delivery:position:{techId}, TTL 10 min).
-- This table is a fallback audit log only.
CREATE TABLE delivery_positions (
  id          BIGSERIAL PRIMARY KEY,
  tech_id     BIGINT    NOT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  accuracy    FLOAT,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_delivery_pos_tech ON delivery_positions(tech_id, recorded_at DESC);
```

**Redis live position key**
```
delivery:position:{techId}  →  { lat, lng, accuracy, updatedAt }   TTL: 10 min
```

**REST endpoints**

| Method | Path | Who | Description |
|---|---|---|---|
| `GET` | `/api/delivery/tasks/today` | DELIVERY | Today's assigned stops, ordered by `stop_order` |
| `GET` | `/api/delivery/tasks/{id}` | DELIVERY | Full task detail (addresses, invoice, phone) |
| `PATCH` | `/api/delivery/tasks/{id}/status` | DELIVERY | Advance status (PICKED_UP / IN_TRANSIT / DELIVERED / FAILED) |
| `POST` | `/api/delivery/tasks/{id}/proof` | DELIVERY | Upload delivery proof photo |
| `POST` | `/api/delivery/position` | DELIVERY | Broadcast current GPS position (called every 30s) |
| `GET` | `/api/delivery/position/{techId}` | TEAM_LEAD, ADMIN | Get last-known position for one tech |
| `GET` | `/api/delivery/positions` | ADMIN | Last-known positions for all active delivery techs |
| `GET` | `/api/delivery/admin/tasks` | TEAM_LEAD, ADMIN | All tasks with filters (date, status, assignedTo) |
| `POST` | `/api/delivery/admin/tasks` | ADMIN | Create a new delivery task (link to shop order or work order) |
| `PATCH` | `/api/delivery/admin/tasks/{id}/assign` | TEAM_LEAD, ADMIN | Assign / reassign to a delivery tech |

#### 2.3.2 — Frontend `/delivery` (Delivery Technician)

```
/delivery                   → Today's summary: N stops, estimated distance, status overview
/delivery/route             → Map view (Leaflet.js): numbered stop markers + route polyline + own live dot
/delivery/tasks             → List view: stop cards ordered by stop_order
/delivery/tasks/:id         → Stop detail: pickup address, drop-off address, client phone,
                              invoice amount, status action buttons, proof photo upload
```

**Map behaviour**

- **Library**: Leaflet.js (open source, no API key)
- Stop markers numbered 1…N in optimized order
- Polyline connects stops in order
- Delivery tech's own live position dot (browser `navigator.geolocation`, updates every 30 s)
- Per-stop button: **"Open in Google Maps"** / **"Open in Waze"** → deep-link with coordinates for turn-by-turn navigation
- Completed stops: greyed out marker with ✓ overlay

**Status action flow per stop**

```
ASSIGNED  →  [Mark Picked Up]  →  PICKED_UP
PICKED_UP →  [Start Delivery]  →  IN_TRANSIT
IN_TRANSIT → [Mark Delivered]  →  DELIVERED  (+ optional proof photo)
           → [Report Failed]   →  FAILED     (+ reason text)
```

#### 2.3.3 — Admin + Team Lead tracking view

```
/admin/delivery             → Map: all active delivery tech dots (polling every 30s)
                              List: each tech's progress (X of Y stops done)
/admin/delivery/:techId     → Single tech map: their route + live position dot + stop list
/team-lead/delivery         → Same as admin/delivery (read-only)
```

**Map behaviour (tracking)**

- Dots colored by status: 🟢 on-time · 🟡 running late · 🔴 failed stop
- Click a dot → side panel with their stop list and current progress
- Auto-refresh every 30 s via polling `GET /api/delivery/positions`

#### 2.3.4 — Notification trigger (delivery-module → notification-module)

- `DELIVERY_STATUS_CHANGE` event published when a task reaches `DELIVERED` or `FAILED`
- `notification-module` consumes: sends WhatsApp (if opted in) + in-app notification to client with delivery status

---

## TRACK 3 — Observability (carry-over)

### C1 — Custom Micrometer metrics `[ ]`
**What**: No custom metrics. Hard to diagnose a quiet outage.
**Files**:
- `maintenance-module/.../scheduler/ServiceDueScheduler.java` — `@Counted` on sweep + success/failure counter
- `notification-module/.../mail/SmtpMailSender.java` — send success/failure counter
- `notification-module/.../kafka/*Consumer.java` — counter per event type

---

## Execution order (recommended)

```
Track 2 first — roles are foundational; other features build on top.

  Phase 1 — 2.0  Role enum + security + DB migrations         (small)
  Phase 2 — 2.1  Enhanced Technician                          (medium)
  Phase 3 — 2.2  Team Lead backend + /team-lead frontend      (medium-large)
  Phase 4 — 2.3  Delivery module backend + task list frontend (large)
  Phase 5 — 2.3  Delivery map + live tracking                 (large)

Track 1 carry-overs can be slotted between phases as fillers:
  A1+A2 (PDF) — slot after Phase 2
  B2 (Book Now CTA) — slot after Phase 3
  B3 (service catalog) — slot after Phase 3
  A3, A4, A5, A6, B1, C1 — low-urgency, any time
```

---

## Out of scope (deferred)

- Mobile app / push notifications via FCM
- Vessel sharing / multi-owner vessels
- Maintenance cost analytics dashboard
- Accessibility (a11y) audit
- Performance / N+1 hardening
- Frontend test harness
