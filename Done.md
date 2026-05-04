# Done — Rigoo Marine

> Completed and shipped tasks, archived from `PAUSE_TASKS.md`.
> Last updated: 2026-05-04

---

## Completed Tasks

| # | Status | Subject |
|---|---|---|
| 2 | done (partial) | Translate Home, Login, Register, Navbar — DONE. Other pages deferred (see Deferred i18n section in PAUSE_TASKS.md) |
| 3 | done | Stripped 4 dead public API helpers (`getGallery`, `getCompanyInfo`, `submitContact`, `submitQuoteRequest`) — no callers, no backend, replaced by item 1 / item 3 |
| 4 | done | Rate-limit `/auth/login` at the gateway (1/sec replenish, burst 5, per-IP; broken `ipKeyResolver` also fixed) |
| 5 | done | Item 1: Service Request Form — backend (V2 migration, `PENDING_APPROVAL` status, fresh `IssueCategory` enum, approve/reject endpoints), gateway rate limit, frontend `ServiceRequest` page in EN+AR, dashboard CTAs |
| 6 | done | Email verification + password reset — full backend + frontend in EN+AR. Live email blocked on SMTP creds; `LogMailSender` is the dev fallback (links recoverable from logs). |
| 7 | done | PLAN.md Phase 0 #6 — search/filter on admin tables. 5 endpoints paginated + filterable. Shared `<FilterableTable>`. Bilingual `admin` namespace. Placeholder admin endpoints removed. |
| 8 | done | Admin approval UI — Approve / Reject buttons on `PENDING_APPROVAL` rows in `OrderManagement`. Reject dialog captures optional reason. Page defaults to the approval queue. |
| 9 | done | Per-service JWT auth retrofit — `SecurityConfig` + `JwtAuthenticationFilter` + `JwtTokenProvider` added to work-order/service/invoice/vessel modules. `pwdIat` claim baked into JWT issuance for stateless session invalidation. `@PreAuthorize` on every admin endpoint. |
| 10 | done | Phone as primary identifier — V4 normalizes existing phones to E.164 + adds UNIQUE. `PhoneNumberService` (libphonenumber, default region QA). Login accepts phone OR email. Register puts phone first. `id BIGSERIAL` retained as SQL PK; phone is the unique business identifier. SMS OTP deferred. |
| 11 | done (Phase 1) | Item 3 marketplace Phase 1 — V2 migration (bilingual `title/description/known_issues/inclusions` EN+AR + UNIQUE `slug` + nullable `listing_id` with CHECK). Public `/boats` gallery (Buy/Rent/All) + `/boats/:slug` detail with animated carousel, sticky CTAs, disabled "Coming soon" Reserve/Offer/Book, bilingual + RTL. Admin CRUD form + inquiry inbox with inline status select. `marketplaceApi`, `marketplace` i18n namespace, gateway routes (strict rate-limit on inquiry POST). Phase 2 (Stripe deposit + rental booking + S3) deferred. |
| 12 | done | Smoke-test fixes (2026-05-04) — per-module Flyway history tables on all 8 backend modules (collision fix), marketplace `baseline-version: 0`, slug generation moved before insert with UUID-8 suffix, client-service heap 256m→512m, mail HealthIndicator disabled, `marketplace-module` wired into docker-compose + start scripts (port 8088, new Dockerfile), `MarketplaceExceptionHandler` maps IllegalArgumentException→400. End-to-end smoke test passing. |
| 13 | done | Stripe webhook scaffold — `stripe-java:27.0.0` in `invoice-module`, `POST /api/payments/webhooks/stripe` with signature verification + stub handlers, gateway route, env vars (`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`). Real handlers deferred to Phase 2 (deposit/booking/order paid). |

---

## Task Detail Log

### Task #2 — i18n: Partial Translations (done partial)
What shipped:
- `src/i18n/index.js` (react-i18next + browser detector, `rigoo.lang` localStorage, syncs `<html lang>` + `dir`)
- `src/i18n/DirectionProvider.jsx` (Emotion `stylis-plugin-rtl` cache + MUI `direction` rebuild)
- `theme.js` exports `buildTheme(direction)`
- Language menu in `Navbar.jsx` (globe icon desktop + drawer entries mobile)
- Translated pages: Home, Login, Register, Navbar
- Locale namespaces: `common`, `navbar`, `home`, `auth` (en + ar)

Deferred (still in PAUSE_TASKS.md → Task #1):
- `Footer.jsx`, all pages under `pages/public/*`, `pages/dashboard/*`, `pages/admin/*`, `pages/technician/*`, `pages/workorder/WorkOrderFlow.jsx`, `pages/error/NotFound.jsx`, hot toast strings
- Backend Spring `MessageSource` + bilingual email templates + bilingual PDF generation
- User language preference column on accounts

---

### Task #3 — Stripped dead public API helpers (done)
- Removed `getGallery`, `getCompanyInfo`, `submitContact`, `submitQuoteRequest` from `services/api.js`.
- No callers; replaced by Item 1 (service request) and Item 3 (marketplace).

---

### Task #4 — Rate-limit `/auth/login` (done)
- Gateway Redis bucket rate limit: 1/sec replenish, burst 5, per-IP.
- Fixed broken `ipKeyResolver` that was allowing the rate-limit to be bypassed.

---

### Task #5 — Service Request Form — Item 1 (done)
Backend (`work-order-module`):
- Flyway `V2__service_request_fields.sql` adds `location_text`, `latitude`, `longitude`, `phone`, `submitted_by_role`, `issue_category_other`, `rejection_reason`, `approved_at`, `approved_by`.
- New `WorkOrderStatus.PENDING_APPROVAL`. New enums `IssueCategory` and `SubmittedByRole`.
- `POST /api/work-orders/service-request`, `PUT /api/work-orders/{id}/approve`, `PUT /api/work-orders/{id}/reject?reason=...`.
- Kafka events: `SERVICE_REQUEST_SUBMITTED`, `SERVICE_REQUEST_APPROVED`, `SERVICE_REQUEST_REJECTED`.

`vessel-module`:
- Added `GET /api/vessels` (list-all) so technicians can pick from any registered vessel.

Gateway:
- New `service-request-ratelimit` route (per-user, 1/sec, burst 3).

Frontend:
- New page `src/pages/workorder/ServiceRequest.jsx` at `/service-request` behind `ProtectedRoute` (CLIENT or TECHNICIAN).
- Vessel picker, location text + GPS button, phone (prefilled), category select with OTHER → text input, description, multi-file upload (≤5, ≤10 MB, image/MP4).
- New `workorder` i18n namespace (en + ar).
- `workOrderApi.submitServiceRequest`, `approve`, `reject` and `vesselApi.getAll` added in `src/services/api.js`.
- Dashboard CTAs updated for CLIENT and TECHNICIAN.

Verification still pending (deferred until full local stack):
- Submit a request as CLIENT and TECHNICIAN; confirm Kafka events; curl rate-limit check.

---

### Task #6 — Email Verification + Password Reset (done)
Backend (`client-module`):
- Flyway `V3__email_verification_password_reset.sql` — adds `email_verified`, token/expiry columns, `password_changed_at`, `password_reset_tokens` table. Backfills existing rows to `email_verified = true`. Seeds `EMAIL_VERIFY` + `PASSWORD_RESET` templates in EN + AR.
- `MailSender` interface with `LogMailSender` (default dev) and `SmtpMailSender` (active when `app.mail.enabled=true`).
- `EmailTemplate` entity + `EmailTemplateService` — picks AR/EN columns based on `Accept-Language`.
- `TokenService` — 256-bit URL-safe random + SHA-256 hash at rest.
- `AuthService` — `issueVerificationToken` (24h TTL), `verifyEmail`, `requestPasswordReset` (15-min TTL), `resetPassword` (single-use, bumps `password_changed_at`).
- `AuthenticationController` — `/api/auth/verify-email`, `/api/auth/resend-verification`, real `/forgot-password` and `/reset-password`.
- `JwtAuthenticationFilter` rejects tokens whose `iat` is older than `password_changed_at`.

Gateway:
- New rate-limit routes for `/auth/forgot-password` (1/sec, burst 3) and `/auth/reset-password` (1/sec, burst 5).

Frontend:
- Real `ForgotPassword.jsx`, new `ResetPassword.jsx`, new `VerifyEmail.jsx`.
- `UnverifiedEmailBanner` in `DashboardLayout` and `TechnicianLayout`.
- New i18n keys in `auth.json` (EN + AR).

To go live: set `MAIL_ENABLED=true`, `SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD`, `MAIL_FROM`.

---

### Task #7 — Search/Filter on Admin Tables (done)
Backend (5 list endpoints converted to filter + paginate):
- `GET /api/work-orders` — `q`, `status`, `submittedByRole`, `technicianId`, `page`, `size`, `sort`.
- `GET /api/services` — `q`, `category`, `active`, paged.
- `GET /api/invoices` — `q`, `status`, `clientId`, paged.
- `GET /api/quotations` — `q`, `status`, `clientId`, paged.
- `GET /admin/users` — `q`, `role`, `verified`, paged.
- JPA `Specification` on each repo. Page size capped at 100. Legacy `/all` endpoints preserved.
- Removed placeholder admin endpoints from `AdminController`.

Frontend:
- New shared `<FilterableTable>` component — debounced search (300 ms), filter dropdowns, MUI `TablePagination`, react-query `keepPreviousData`.
- All 5 admin pages rewritten: `OrderManagement`, `UserManagement`, `ServiceManagement`, `InvoiceManagement`, `QuotationManagement`.
- New `admin` i18n namespace (en + ar).

---

### Task #8 — Admin Approval UI (done)
- Approve / Reject buttons on `PENDING_APPROVAL` rows in `OrderManagement`.
- Reject dialog captures optional reason.
- Page defaults to the approval queue on load.

---

### Task #9 — Per-Service JWT Auth Retrofit (done)
- `client-module` `JwtTokenProvider.generateToken` embeds `pwdIat` claim.
- `JwtAuthenticationFilter` reads `pwdIat` from claim (no DB round-trip).
- 4 downstream modules each got: `JwtTokenProvider` (validate-only), `JwtAuthenticationFilter`, `SecurityConfig`.
- `service-module` `pom.xml` gained `spring-boot-starter-security`. All 4 modules gained `jjwt-api`/`-impl`/`-jackson` 0.12.5.
- Each module's `application.yml` gained `jwt.secret: ${JWT_SECRET:default}`.
- `@PreAuthorize` annotations:
  - `work-order`: admin-only for search/approve/reject/assign/delete; ADMIN+TECHNICIAN for updateStatus; authenticated for `/my`, POST, service-request.
  - `service`: admin-only for POST/PUT/DELETE; public GET catalog; ADMIN-only GET /all.
  - `invoice`/`quotation`: admin-only for search/getAll/POST/PUT-status/DELETE; authenticated for /my, /{id}, /{id}/pdf.
  - `vessel`: ADMIN+TECHNICIAN for list-all; authenticated for rest.

Architectural note: vessel CRUD (`PUT/DELETE /api/vessels/{id}`) still lacks ownership check — follow-up task needed.

Verification still pending (deferred until full local stack):
- JWT across all 6 services with shared `JWT_SECRET`; old token rejection after password change.

---

### Task #10 — Phone as Primary Identifier (done)
Backend (`client-module`):
- `PhoneNumberService` wraps Google `libphonenumber`, default region QA. Normalizes to E.164.
- Flyway `V4__normalize_phones_and_unique` — normalizes existing phones to E.164, adds `UNIQUE` constraint + index.
- `Client.phone` annotated `unique = true`.
- `ClientRepository`: `findByPhone`, `existsByPhone`.
- `ClientService` normalizes phone before persisting. Uniqueness collision → 400.
- `AuthenticationController.login` accepts `{phone, password}` or `{email, password}`.
- `client-module/pom.xml` gained `com.googlecode.libphonenumber:libphonenumber:8.13.50`.

Frontend:
- `authApi.login(identifier, password)` — auto-detects phone vs email.
- `Login.jsx` single input "Phone or email".
- `Register.jsx` reordered: phone first, email second.
- i18n: new keys in EN + AR.

Deferred (intentionally out of scope):
- JWT `sub` change to phone or `id`.
- SMS OTP (Twilio Verify).
- Phone change confirmation via OTP.

Verification still pending (deferred until full local stack):
- V4 migration against non-empty DB; login with phone and email paths; duplicate phone rejection.

---

### Task #11 — Used Boat Marketplace Phase 1 (done — Phase 1 only)
Locked decisions:
- A1 full bilingual content (EN + AR on `title`, `description`, `known_issues`, `inclusions`).
- B1 real `slug` column (UNIQUE NOT NULL, auto-generated `slugify(titleEn) + '-' + id` on create; admin-overridable on update).
- C nullable `listing_id` on inquiries with DB CHECK enforcing it for BUY/RENT/INSPECTION; one admin inbox.
- Reserve / Make-offer / Book CTAs anchored but disabled with "Coming soon" tooltip.
- Image storage = admin-pasted URLs for Phase 1; S3 + thumbnails are Phase 2.

Backend (`marketplace-module`):
- Flyway `V2__bilingual_slug_and_general_inquiries.sql` — adds bilingual columns + `slug` (UNIQUE NOT NULL, indexed); backfills then drops legacy single-locale columns; nulls + CHECK on `boat_inquiries.listing_id`.
- `BoatListing` entity, DTO, mapper, `BoatListingService.search()` predicates (locale-aware q match), slug auto-generation in `create()`, `getBySlug()`, `BoatListingRepository.findBySlug` / `existsBySlug`.
- `BoatInquiry` entity (nullable `listingId`), `BoatInquiryService.create()` friendly 400 for listing-bound types, `CreateInquiryRequest` no longer `@NotNull` on listingId.
- New endpoint `GET /api/listings/by-slug/{slug}`, permitted in `SecurityConfig`.

Gateway (`gateway-module/application.yml`):
- `marketplace-inquiry-create-ratelimit` (POST /api/listings/inquiries, IP-keyed 1/sec burst 3) declared before `marketplace-service` (/api/listings/**, IP-keyed 20/sec burst 40).

Frontend:
- `services/api.js` → `marketplaceApi` (search/get/getBySlug/CRUD/inquiry/inquiry status).
- `i18n/locales/{en,ar}/marketplace.json` (full coverage), namespace registered in `i18n/index.js`. Navbar link added.
- Reusable `src/components/marketplace/`: `BoatCard` (Grow with index-staggered delay + hover lift), `BoatPhotoCarousel` (cross-fade + scale, animated dots), `InquiryDialog` (Slide-up).
- Public `src/pages/public/marketplace/`: `BoatGallery` (Buy/Rent/All toggle, filter sidebar, paged grid with skeleton loaders), `BoatDetail` (animated carousel, Grow-staggered spec sections, sticky CTA panel, RTL-aware back arrow, disabled "Coming soon" CTAs).
- Admin `src/pages/admin/`: `BoatListingManagement` (FilterableTable with status + mode filters, row edit/delete, New CTA), `BoatListingForm` (multi-section create/edit page, bilingual fields side by side, rental fields disabled until forRent), `BoatInquiryManagement` (FilterableTable with inline status select).
- Routes in `App.jsx`. `AdminLayout` nav extended with Boats + Inquiries.

Animation pass (no new deps): MUI Fade/Grow/Slide, hover lifts, skeletons, photo cross-fade. Captured as a feedback memory.

Verification:
- `mvn -pl marketplace-module -am clean compile` ✓
- `npm run build` ✓ (5.5 s)
- `npx eslint` on marketplace files → 0 errors.

Live smoke test still pending (full local stack not up): admin creates a listing → public gallery + detail render → inquiry submits land in admin inbox → Arabic RTL verified.

Phase 2 (deferred — blocks on Stripe + S3): Stripe Checkout deposit (20%, 7-day TTL), `BoatRentalBooking` + `BoatAvailability` calendar, S3 + thumbnails.

Phase 3 (deferred): offers, e-sign, KYC, view counts, similar-listings, favorites/saved searches, audit log per status transition.

Small follow-ups noted: no `preferred_date` / `locale` on inquiries (left as nice-to-haves), no bulk for_sale/for_rent toggle on admin list (handled via edit form), pre-existing repo-wide lint errors not addressed.

---

### Task #12 — Smoke-test fixes (done)
Pre-existing and Phase-1 issues surfaced when bringing the stack up live, all fixed in the same session.

- **Per-module Flyway tables** — added `spring.flyway.table: flyway_schema_history_<module>` to all 8 application.yml files. Each module now owns its own history; previously all collided on default `flyway_schema_history`.
- **Marketplace `baseline-version: 0`** — required so V1 actually runs against an already-non-empty schema (other modules' tables); default was 1 which baselined-and-skipped.
- **Slug pre-insert** — `BoatListingService.create()` now sets slug = `slugify(titleEn) + "-" + UUID8` before save, single trip, no more NOT-NULL violations.
- **client-service heap** — `JAVA_TOOL_OPTIONS=-Xmx512m -Xms256m` in docker-compose.yml (was 256m → OOM-killed exit 137).
- **Mail HealthIndicator off** — `management.health.mail.enabled: false` so /actuator/health doesn't go DOWN against `smtp.example.com`.
- **marketplace-service plumbed into infra** — new `marketplace-module/Dockerfile`, marketplace-service block in `docker-compose.yml` (port 8088), added to `start-all-docker.sh` mvn list + healthy-threshold (11→12), added to `start-dev.sh` service loop.
- **`MarketplaceExceptionHandler`** — `@RestControllerAdvice` mapping `IllegalArgumentException` → 400 (was bubbling to `/error` → 403).

Verified end-to-end: register admin → JWT → POST/GET listings (bilingual + slug) → POST inquiries (BUY with listingId, GENERAL without, BUY without listingId all return correct status codes).

---

_Archived: 2026-05-04. Active/paused tasks remain in PAUSE_TASKS.md._
