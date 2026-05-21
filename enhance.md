# Rigoo Marine — Enhancement Roadmap

> **Scope**: Pending and planned work only. Completed items removed.
> **Legend**: `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE

---

## All tracks complete

Every item previously listed in TRACK 1 (carry-overs), TRACK 2 (Delivery Technician Phases 1–5),
and TRACK 3 (Observability) has been implemented and verified.

### Summary of completed items

| Item | What | Where |
|------|------|-------|
| **A1** | Arabic font in PDF renderer — configurable path, auto-probe, Helvetica fallback | `MaintenanceDossierPdfRenderer.java`, `application.yml` |
| **A2** | Vessel name in PDF header — internal cross-service call | `VesselClient.getVesselSummary`, `InternalVesselController`, `VesselMaintenanceController` |
| **A3** | Bilingual in-app notification text | `ServiceDueEventConsumer` (uses `preferred_language`) |
| **A4** | Remove dead notification stub | `NotificationService.processWorkOrderEvent` removed |
| **A5** | Pagination on admin maintenance dashboard | `AdminMaintenanceService.findUpcomingPaged`, `MaintenanceDashboard.jsx` |
| **A6** | Audit log for admin maintenance ops | `MaintenanceAuditLogger` wired in `ServiceScheduleService` + `ServiceHistoryService` |
| **B1** | Notification idempotency via Redis SETNX | `EventDedupe` used in all 3 consumers |
| **B2** | "Book now" CTA on service reminders | `actionUrl` in event + notification entity; `NotificationBell`, `Notifications.jsx`, `ServiceRequest.jsx` pre-fill |
| **B3** | Service catalog in Add-Reminder dialog | `EditScheduleDialog` fetches `/api/services`, shows name + QAR price |
| **C1** | Micrometer metrics | `MaintenanceMetrics` in scheduler; `notification.mail.sent/failed.total` in `SmtpMailSender` |
| **Delivery** | Full delivery module (Phases 1–5) | Backend port 8092, Leaflet map, GPS tracking, admin/team-lead views |

---

## Out of scope (deferred)

- Mobile app / push notifications via FCM
- Vessel sharing / multi-owner vessels
- Maintenance cost analytics dashboard
- Accessibility (a11y) audit
- Performance / N+1 hardening
- Frontend test harness
