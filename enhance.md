# Enhancement Plan — Post-session Follow-ups

Consolidates the four "next slice" tracks (revenue+polish / pure revenue /
quality / finish-followups) into a single de-duplicated execution plan.
13 unique items, sequenced by dependency: foundations first, quality
second, revenue last.

## Status legend
- [ ] TODO
- [~] IN PROGRESS
- [x] DONE — commit SHA noted

---

## Phase 1 — Finish-what-we-started (Bucket A)

### A4 — Remove dead code [ ]
**What**: `NotificationService.processWorkOrderEvent` is an unreferenced stub
left over from before the bell feature.
**Files**: `notification-module/src/.../service/NotificationService.java` (1)

### A2 — Vessel name on the PDF header [ ]
**What**: The PDF currently shows `#42` instead of `"Al Bahar"`. Needs an
internal endpoint + client call.
**Files**:
- `vessel-module/src/.../controller/InternalVesselController.java` — add `GET /api/internal/vessels/{id}/name`
- `maintenance-module/src/.../client/VesselClient.java` — `getVesselName()`
- `maintenance-module/src/.../controller/VesselMaintenanceController.java` — wire into PDF call

### A1 — Arabic font in the PDF renderer [ ]
**What**: Currently locale=ar emits Arabic LABELS but body text is Helvetica
(no Arabic glyphs → boxes). Use a configurable font path with sensible
defaults; don't bundle a binary (licensing + commit size).
**Files**:
- `maintenance-module/src/.../service/MaintenanceDossierPdfRenderer.java` — load font from configurable path
- `maintenance-module/src/main/resources/application.yml` — `app.maintenance.pdf.arabic-font-path` config key

### A3 — Bilingual in-app notification text [ ]
**What**: `preferred_language` work in `49c34cc` made emails bilingual, but
`ServiceDueEventConsumer` still builds the in-app `Notification` row text
in English via hard-coded `title()` and `body()` helpers.
**Files**: `notification-module/src/.../kafka/ServiceDueEventConsumer.java`

### A5 — Pagination on admin maintenance dashboard [ ]
**What**: Returns every overdue+due-soon row today. Fine at 50 vessels,
brittle at 5000.
**Files**:
- `maintenance-module/src/.../service/AdminMaintenanceService.java` — return `Page<>`
- `maintenance-module/src/.../controller/MaintenanceAdminController.java` — accept `Pageable`
- `pages/admin/MaintenanceDashboard.jsx` — `<Pagination>` control

### A6 — Audit log entries for admin maintenance ops [ ]
**What**: Admin schedule edits/snoozes via the ADMIN bypass don't write
`admin_audit` rows. Compliance gap.
**Files**:
- `maintenance-module/src/.../service/MaintenanceAuditLogger.java` (new) — JdbcTemplate insert into shared `admin_audit` table
- `ServiceScheduleService` — write audit row on admin-actor mutations
- `ServiceHistoryService` — same on admin-actor delete

---

## Phase 2 — Quality / production-readiness (Bucket B)

### B3 — Notification idempotency [ ]
**What**: Kafka redelivery of `ServiceDueEvent` would create duplicate
in-app rows AND duplicate emails. Need `eventId` dedupe via Redis SETNX.
**Files**:
- `notification-module/src/.../kafka/EventDedupe.java` (new) — Redis-backed `firstTime(eventId)` check
- `ServiceDueEventConsumer` — bail early when `firstTime` returns false
- `WorkOrderCompletedEventConsumer` — same pattern

### B5 — Observability metrics [ ]
**What**: No custom Micrometer metrics. Hard to debug a quiet outage.
**Files**:
- `maintenance-module/.../scheduler/ServiceDueScheduler.java` — `@Counted` or `MeterRegistry` for sweep cardinality, publish success/failure
- `notification-module/.../mail/SmtpMailSender.java` — counter on send success/failure
- `notification-module/.../kafka/*Consumer.java` — counter per event type

### B4 — Email unsubscribe link [ ]
**What**: Qatar PDPL + general best-practice. One-click opt-out.
**Files**:
- `client-module/.../db/migration/V9__unsubscribe.sql` — `clients.unsubscribe_token`, `clients.notifications_paused`
- `client-module/.../entity/Client.java` — fields
- `notification-module/.../mail/EmailTemplateService.java` — append unsub URL with token to every send
- `client-module/.../controller/PublicUnsubscribeController.java` (new) — `GET /unsubscribe?t=<token>` page + POST to confirm
- email templates V4 migration — `{{unsubscribeUrl}}` placeholder
- Send-skip predicate in EmailTemplateService when `notifications_paused=true`

### B1 — Backend tests for new surfaces [ ]
**What**: 4 modules with new code, no unit tests on the new paths.
**Files**:
- `AdminMaintenanceServiceTest` — filter logic + urgency classification
- `MaintenanceDossierPdfRendererTest` — smoke (output is non-empty PDF) + label switching
- `NotificationServiceTest` — markAsRead ownership-check 404 collapse, markAllRead idempotency
- `EventDedupeTest` — Redis SETNX behavior (mocked)

---

## Phase 3 — Revenue track (Bucket C)

### C5 — Service-catalog wired into Add-Reminder dialog [ ]
**What**: Currently the dropdown is hardcoded `ServiceType` enum values.
Service-module has a catalog with names, descriptions, prices. Surface
that, with sensible interval-day defaults per ServiceType.
**Files**:
- `EditScheduleDialog.jsx` — fetch `/api/services/all` on open, show name + price beside the type
- `services/api.js` — already has `publicApi.getServices`
- Mapping helper `DEFAULT_INTERVALS` for the seed types (OIL_CHANGE → 180d/100h, ANTIFOULING → 365d, ...)

### C1 — "Book now" CTA on OVERDUE reminders [ ]
**What**: Highest-leverage business move. Currently the email tells the
user to log into the dashboard. Make it 1-click → pre-filled service
request → revenue.
**Files**:
- `notification-module/.../kafka/ServiceDueEventConsumer.java` — include `actionUrl` in the `Notification.message` payload + template placeholder
- `notification-module/.../db/migration/V4__service_due_action.sql` — extend `SERVICE_DUE` template with `{{bookUrl}}`
- `notification-module/.../entity/Notification.java` + DTO — `actionUrl` column (V4)
- `notification-module/.../db/migration/V4__notification_action_url.sql` — `notifications.action_url`
- Frontend `Notifications.jsx` + `NotificationBell.jsx` — render "Book now" button when actionUrl is set
- `ServiceRequest.jsx` — pre-fill vessel + serviceType from query params

### C2 — WhatsApp channel for reminders [ ]
**What**: Qatar uses WhatsApp heavily. Existing Twilio integration (OTP)
can be extended.
**Files**:
- `notification-module/pom.xml` — Twilio SDK (already present in client-module)
- `notification-module/.../whatsapp/WhatsAppSender.java` (new)
- `client-module/.../db/migration/V10__client_whatsapp_opt_in.sql`
- `Profile.jsx` — WhatsApp opt-in toggle
- `ServiceDueEventConsumer` — send WhatsApp in addition to email when opted in
- `RecipientLookup` — return whatsappOptIn flag

---

## Commit cadence

One commit per item where it's a clean unit. Where items pair (A1+A2 for the
PDF Arabic story), bundle. Target: ~10 commits total.

## Out of scope (deferred again)

- Mobile app / push notifications via FCM
- Vessel sharing / multi-user vessels
- Maintenance cost analytics dashboard
- A11y audit
- Performance / N+1 hardening
- Frontend test harness (separate infra commit)
