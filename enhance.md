# Rigoo Marine — Enhancement Roadmap

> **Scope**: Pending and planned work only. Completed items removed.
> **Legend**: `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE

---

## TRACK 1 — Carry-over: Unfinished items

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

## TRACK 2 — Delivery Technician `[ ]`

**Status**: Phase 4 (next up). Phases 1–3 (Role foundations, Enhanced Technician, Team Lead) are complete.

**Responsibilities**: picks up shop-order products and work-order parts from variable supplier / warehouse locations and delivers them to client addresses. Has a daily stop list with map visualization and live GPS tracking visible to Admin and Team Lead.

### Phase 4 — Delivery module backend + task list frontend

#### DB schema — `delivery-module`

```sql
-- V1__delivery_tasks.sql
CREATE TABLE delivery_tasks (
  id                BIGSERIAL PRIMARY KEY,
  type              VARCHAR(20)  NOT NULL,   -- SHOP_ORDER | WORK_ORDER_PARTS
  reference_id      BIGINT       NOT NULL,   -- shop_order.id or work_order.id
  assigned_to       BIGINT,                  -- delivery tech (clients.id)
  status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  -- PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED | FAILED

  pickup_label      VARCHAR(255),
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
  stop_order        INTEGER,
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

#### REST endpoints — port 8089

| Method | Path | Who | Description |
|---|---|---|---|
| `GET` | `/api/delivery/tasks/today` | DELIVERY | Today's assigned stops, ordered by `stop_order` |
| `GET` | `/api/delivery/tasks/{id}` | DELIVERY | Full task detail |
| `PATCH` | `/api/delivery/tasks/{id}/status` | DELIVERY | Advance status |
| `POST` | `/api/delivery/tasks/{id}/proof` | DELIVERY | Upload delivery proof photo |
| `POST` | `/api/delivery/position` | DELIVERY | Broadcast current GPS position (every 30 s) |
| `GET` | `/api/delivery/position/{techId}` | TEAM_LEAD, ADMIN | Last-known position for one tech |
| `GET` | `/api/delivery/positions` | ADMIN | Last-known positions for all active delivery techs |
| `GET` | `/api/delivery/admin/tasks` | TEAM_LEAD, ADMIN | All tasks with filters |
| `POST` | `/api/delivery/admin/tasks` | ADMIN | Create a delivery task |
| `PATCH` | `/api/delivery/admin/tasks/{id}/assign` | TEAM_LEAD, ADMIN | Assign / reassign |

#### Frontend `/delivery` (Delivery Technician)

```
/delivery                   → Today's summary: N stops, estimated distance, status overview
/delivery/route             → Map view (Leaflet.js): numbered stop markers + route polyline + own live dot
/delivery/tasks             → List view: stop cards ordered by stop_order
/delivery/tasks/:id         → Stop detail: pickup + drop-off addresses, client phone,
                              invoice amount, status action buttons, proof photo upload
```

**Status action flow per stop**
```
ASSIGNED  →  [Mark Picked Up]  →  PICKED_UP
PICKED_UP →  [Start Delivery]  →  IN_TRANSIT
IN_TRANSIT → [Mark Delivered]  →  DELIVERED  (+ optional proof photo)
           → [Report Failed]   →  FAILED     (+ reason text)
```

### Phase 5 — Delivery map + live tracking

**Map behaviour (delivery tech)**
- Library: Leaflet.js (open source, no API key)
- Stop markers numbered 1…N in optimized order; polyline connects them
- Delivery tech's own live position dot (`navigator.geolocation`, updates every 30 s)
- Per-stop button: **"Open in Google Maps"** / **"Open in Waze"** deep-link
- Completed stops: greyed-out marker with ✓ overlay

**Admin + Team Lead tracking views**
```
/admin/delivery             → Map: all active delivery tech dots (polling every 30 s)
                              List: each tech's progress (X of Y stops done)
/admin/delivery/:techId     → Single tech map: route + live position + stop list
/team-lead/delivery         → Same as admin/delivery (read-only)
```
- Dots colored by status: green on-time · yellow running late · red failed stop
- Click a dot → side panel with stop list and current progress

**Notification trigger**
- `DELIVERY_STATUS_CHANGE` Kafka event on `DELIVERED` or `FAILED`
- `notification-module` sends WhatsApp (if opted in) + in-app notification to client

---

## TRACK 3 — Observability

### C1 — Custom Micrometer metrics `[ ]`
**What**: No custom metrics. Hard to diagnose a quiet outage.
**Files**:
- `maintenance-module/.../scheduler/ServiceDueScheduler.java` — `@Counted` on sweep + success/failure counter
- `notification-module/.../mail/SmtpMailSender.java` — send success/failure counter
- `notification-module/.../kafka/*Consumer.java` — counter per event type

---

## Execution order (recommended)

```
Phase 4 — Delivery module backend + task list frontend   (large)
Phase 5 — Delivery map + live tracking                   (large)

Track 1 carry-overs slot between phases as fillers:
  A1 + A2  (PDF fixes)          — slot after Phase 4
  B2       (Book Now CTA)       — slot after Phase 4
  B3       (service catalog)    — slot after Phase 4
  A3, A4, A5, A6, B1, C1        — low-urgency, any time
```

---

## Out of scope (deferred)

- Mobile app / push notifications via FCM
- Vessel sharing / multi-owner vessels
- Maintenance cost analytics dashboard
- Accessibility (a11y) audit
- Performance / N+1 hardening
- Frontend test harness
