# Scheduled Task Check Report
_Generated: 2026-04-29 by `check-planfile` scheduled task_

---

## Files Read

- `PLAN.md` — Full Rigoo Marine roadmap (locked features 1–4 + layered backlog + sequencing)
- `PAUSE_TASKS.md` — Sprint checkpoint / resume file
- `MOBILE_PLAN.md` — Mobile (React Native + Expo) roadmap

---

## Current Stop Point

**Last completed task: Task #10 — Phone as Primary Identifier (SHIPPED)**

All tasks in the sprint have been reconciled:

| # | Status | Subject |
|---|---|---|
| 1 | paused | i18n + RTL + language switcher (foundation done; rest deferred) |
| 2–10 | ✅ done | Archived to `Done.md` |

---

## Done Archive

Tasks #2–#10 have been moved to `Done.md` in this directory. Summary:

- **#2** (partial): Home, Login, Register, Navbar translated EN+AR
- **#3**: Stripped 4 dead public API helpers
- **#4**: Rate-limit `/auth/login` at the gateway
- **#5**: Service Request Form — full backend + frontend EN+AR
- **#6**: Email verification + password reset — full backend + frontend EN+AR
- **#7**: Search/filter on all 5 admin tables with shared `<FilterableTable>`
- **#8**: Admin Approval UI (Approve / Reject on `PENDING_APPROVAL` orders)
- **#9**: Per-service JWT auth retrofit across 4 downstream modules
- **#10**: Phone as primary identifier — E.164 normalization, UNIQUE constraint, dual login

---

## Next Concrete Step on Resume

**Provision SMTP provider** — flip `MAIL_ENABLED=true` so email verification + password reset actually leave the box.

Then in order:
1. SMS OTP login (Twilio Verify) — once live, email-based reset can be sunset
2. Vessel ownership check on `PUT/DELETE /api/vessels/{id}` — any authenticated user can currently edit any vessel
3. Same ownership check on `POST /api/work-orders/service-request`
4. Resume deferred i18n work (Task #1) — frontend leftover pages + backend Spring `MessageSource`
5. Tighter rate limits on `/auth/register`
6. Fix double-password-encode bug in `AuthenticationController.updatePassword`
7. Move technician vessel picker to assigned-vessels-only
8. Swap local-disk media to S3 behind `fileApi.upload`
9. Token blacklist on logout (Redis-backed revocation list)
10. JWT `sub` migration to phone or `id` (batch with SMS OTP rollout)

---

## Open Credentials Still Needed

| Credential | Needed For | Status |
|---|---|---|
| SMTP provider (Resend/SES/Mailgun) | `MAIL_ENABLED=true`, email verification + reset live | **Blocking** |
| Stripe API keys | Parts shop checkout, boat deposit flow | Deferred |
| MyFatoorah/Tap keys | Qatar local payment gateway | Deferred |
| S3 / compatible storage | Media upload at scale | Deferred |
| WhatsApp Cloud API | Invoice/quotation dispatch | Deferred (§7.5 of MOBILE_PLAN.md) |

---

## Mobile Plan Status (MOBILE_PLAN.md)

Mobile development has not started yet. Plan is fully documented. Prerequisites before kickoff:
- pnpm monorepo conversion
- springdoc-openapi published across all services
- Backend JWT refresh-token endpoint (§7.1) — also unblocks the per-service auth retrofit above

---

## Pause Task Note

This scheduled task (`check-planfile`) runs automatically.
- Completed tasks (#2–#10) moved to `Done.md`.
- `PAUSE_TASKS.md` cleaned up — only Task #1 (paused) remains in the task table.
- No code changes were made.

---

_Last updated: 2026-04-29 (Tasks #2–#10 archived to Done.md. Current priority = provisioning real SMTP creds. Task #1 i18n still paused.)_
