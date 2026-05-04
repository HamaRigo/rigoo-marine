# Done Work — Rigoo Marine

Archive of shipped features. Each section captures what shipped, deferred follow-ups, and verification still to do.

Active planning lives in `PAUSE_TASKS.md` and `PLAN.md`. When a task completes there, its detail moves here.

---

## #1 — i18n foundation (AR + EN with RTL)

**Shipped:** the foundation only. Per-page translation work continues in batches as new surfaces are built. See "Deferred i18n work" in `PAUSE_TASKS.md` for the remaining surfaces.

What shipped:
- `src/i18n/index.js` — react-i18next + browser language detector, `rigoo.lang` localStorage, syncs `<html lang>` + `dir`.
- `src/i18n/DirectionProvider.jsx` — Emotion `stylis-plugin-rtl` cache + MUI `direction` rebuild.
- `src/theme.js` exports `buildTheme(direction)`.
- Language menu in `Navbar.jsx` — globe icon (desktop) + drawer entries (mobile).
- Translated pages: `Home`, `Login`, `Register`, `Navbar`.
- Locale namespaces seeded: `common`, `navbar`, `home`, `auth` (en + ar).

Locked decisions baked into the foundation:
- Currency = QAR (single base).
- Languages = AR + EN (RTL for AR).
- Anonymous default language = English (toggle visible to switch to Arabic). Note: `i18n/index.js` currently has `fallbackLng: 'ar'` — flip to `'en'` to fully match the locked decision.

---

## #3 — Strip dead public API helpers

Stripped 4 frontend helpers that called endpoints with no backing and no callers — replaced by item 1 / item 3 in `PLAN.md`:

- `getGallery`
- `getCompanyInfo`
- `submitContact`
- `submitQuoteRequest`

---

## #4 — Rate-limit `/auth/login` at the gateway

What shipped:
- New route `auth-login-ratelimit` in `gateway-module/src/main/resources/application.yml` matching `POST /auth/login` only, with `RequestRateLimiter` (replenishRate=1/sec, burstCapacity=5) keyed by client IP. Returns HTTP 429 once the bucket drains.
- Fixed `RateLimitConfig.java` — old `ipKeyResolver` returned the literal string `"ip"` for every request, so all routes using it shared a single global bucket. Now resolves real `RemoteAddress` (no `X-Forwarded-For` trust — gateway is the edge).

Other auth endpoints (`/auth/register`, `/auth/forgot-password`) initially un-limited via the catch-all `auth-passthrough` route. `forgot-password` + `reset-password` later got their own limits — see #6.

---

## #5 — Item 1: Service Request Form

Locked decisions:
- Vessel: must pick a registered vessel; admin must approve before a technician is assigned.
- Technician submissions: same flow as client; `clientId` set to the **vessel owner's** id, `submittedByRole=TECHNICIAN` tags origin.
- Media: ≤5 files, ≤10 MB each, images + MP4 only.
- Categories: fresh enum (`ENGINE`, `ELECTRICAL`, `HULL`, `PROPULSION`, `NAVIGATION`, `PLUMBING`, `SAFETY`, `MAINTENANCE`, `OTHER`) with `OTHER` → free-text.

Backend, `work-order-module`:
- Flyway `V2__service_request_fields.sql` adds `location_text`, `latitude`, `longitude`, `phone`, `submitted_by_role`, `issue_category_other`, `rejection_reason`, `approved_at`, `approved_by`.
- New `WorkOrderStatus.PENDING_APPROVAL` (initial state for service-request submissions). New enums `IssueCategory` and `SubmittedByRole`.
- `POST /api/work-orders/service-request` (JSON, no multipart — frontend uploads media via existing `/api/clients/upload` then sends URLs).
- `PUT /api/work-orders/{id}/approve` and `PUT /api/work-orders/{id}/reject?reason=...` (admin transitions).
- Kafka events: `SERVICE_REQUEST_SUBMITTED`, `SERVICE_REQUEST_APPROVED`, `SERVICE_REQUEST_REJECTED`.

`vessel-module`: added `GET /api/vessels` (list-all) so technicians can pick from any registered vessel.

Gateway: new `service-request-ratelimit` route in `application.yml` (per-user, replenishRate=1/sec, burstCapacity=3) sitting before the catch-all `work-order-service` route.

Frontend:
- New page `src/pages/workorder/ServiceRequest.jsx`, mounted at `/service-request` behind `ProtectedRoute` (CLIENT or TECHNICIAN). Vessel picker (own vessels for CLIENT; all vessels for TECHNICIAN), location text + GPS button, phone (prefilled), category select with `OTHER` → text input, description, multi-file upload reusing `fileApi.upload`.
- New `workorder` namespace in `src/i18n/locales/{en,ar}/workorder.json`, registered in `src/i18n/index.js`.
- `workOrderApi.submitServiceRequest`, `approve`, `reject` and `vesselApi.getAll` added in `src/services/api.js`.
- Dashboard CTAs updated: CLIENT `DashboardHome` and TECHNICIAN `TechnicianDashboard` now link to `/service-request`.

Deferred follow-ups (later shipped under #8):
- Admin approval UI for `PENDING_APPROVAL` orders.

---

## #6 — Email verification + password reset

Locked best-practice decisions:
- Don't block login on unverified email; gate sensitive actions instead. Show a banner with a "Resend" button.
- Grandfather existing accounts (`email_verified=TRUE` for all rows in V3, `FALSE` only for new registrations after V3).
- Token TTLs: 15 min reset, 24 h verify. Single-use, hashed at rest (SHA-256), constant-time compare. New reset invalidates older unused tokens for the same client.
- Generic success on `/forgot-password` regardless of whether the email exists (prevents user enumeration).
- Invalidate active sessions on password change via a `password_changed_at` column + JWT `iat` check.
- Translate email templates as we build (AR + EN side-by-side in `email_templates`).

Backend (`client-module`):
- Flyway `V3__email_verification_password_reset.sql` adds `email_verified` (default false, **backfilled to true for existing rows** — grandfather policy), `email_verification_token_hash`, `email_verification_expires_at`, `password_changed_at` on `clients`. New `password_reset_tokens` table. Adds `subject_ar` + `body_ar` to `email_templates` and seeds `EMAIL_VERIFY` + `PASSWORD_RESET` rows in EN + AR.
- `MailSender` interface with two `@ConditionalOnProperty` beans: `LogMailSender` (default — logs full body so links are recoverable) and `SmtpMailSender` (active when `app.mail.enabled=true`, uses Spring `JavaMailSender`).
- `EmailTemplate` entity + `EmailTemplateService` — picks AR or EN columns based on `Accept-Language`, replaces `{{name}}` / `{{link}}` placeholders.
- `TokenService` — 256-bit URL-safe random + SHA-256 hash for at-rest storage + constant-time `MessageDigest.isEqual` compare.
- `AuthService` orchestrating `issueVerificationToken(email, locale)` (24 h TTL), `verifyEmail(token)`, `requestPasswordReset(email, locale)` (15-min TTL, invalidates older unused tokens for the same client), `resetPassword(token, newPassword)` (single-use; bumps `password_changed_at`).
- `AuthenticationController`: `/api/auth/register` now triggers verification email; new `/api/auth/verify-email`, `/api/auth/resend-verification`; `/forgot-password` and `/reset-password` replaced with real implementations (kept generic success on `/forgot-password` to prevent user enumeration).
- `JwtAuthenticationFilter` rejects tokens whose `iat` is older than the user's `password_changed_at` — invalidates active sessions on password change. `ClientService.updateClientWithPassword` now bumps `password_changed_at`.

Gateway: new routes `auth-forgot-password-ratelimit` (per-IP, 1/sec, burst 3) and `auth-reset-password-ratelimit` (per-IP, 1/sec, burst 5), placed before the catch-all `auth-passthrough` route.

Config (`client-module/application.yml`): `app.public-base-url`, `app.mail.enabled`, `app.mail.from`, plus a `spring.mail.*` block driven by env vars.

`client-module/pom.xml`: `spring-boot-starter-mail` added.

Frontend:
- `ForgotPassword.jsx` — TODO stub replaced with real `authApi.forgotPassword(email)` + 429 handling + i18n.
- New `ResetPassword.jsx` at `/reset-password?token=...` — new + confirm fields, validates 6-char min and match, calls `authApi.resetPasswordWithToken`, redirects to `/login` on success.
- New `VerifyEmail.jsx` at `/verify-email?token=...` — auto-calls `authApi.verifyEmail` on mount, shows success/error/missing-token states.
- Routes wired in `App.jsx`.
- New `UnverifiedEmailBanner` component mounted in `DashboardLayout` and `TechnicianLayout`; submit button on the service-request page is disabled when `user.emailVerified === false`.
- i18n: new `forgotPassword`, `resetPassword`, `verifyEmail`, `unverifiedBanner` blocks added to `auth.json` in EN + AR.
- `services/api.js`: added `authApi.resetPasswordWithToken(token, newPassword)`.

Live verification still pending (until SMTP provider is provisioned + local stack is up):
- Boot `client-service` + `gateway` + frontend in dev (SMTP off). Register a new account → expect verification email body printed to `client-service` logs; click the logged link → expect `Email verified` page.
- Forgot-password flow: `POST /auth/forgot-password` → expect reset email in logs → click link → set new password → confirm old JWT is rejected (the filter check kicks in).
- Rate-limit curl checks against `/auth/forgot-password` and `/auth/reset-password` (expect 429 after burst).
- When SMTP creds arrive: set `MAIL_ENABLED=true`, `SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD`, `MAIL_FROM`. No code change needed.

---

## #7 — Search/filter on admin tables (`PLAN.md` Phase 0 #6, last sub-item)

Locked best-practice decisions:
- Frontend admin pages talk to the underlying microservices directly (via gateway) instead of routing through an `AdminController` BFF. The BFF placeholders in `AdminController` returned empty lists — removed.
- Use Spring's `Page<T>` for pagination shape. Standard, frontend-library-friendly.
- JPA `Specifications` for composable filters (one builder per entity).

Backend — 5 list endpoints converted to filter + paginate, returning Spring `Page<T>`:
- `GET /api/work-orders` — `q` (description/notes/locationText), `status`, `submittedByRole`, `technicianId`, `page`, `size`, `sort` (default `createdAt,desc`).
- `GET /api/services` — `q` (name/description), `category`, `active`, paged (default `name,asc`).
- `GET /api/invoices` — `q` (invoiceNumber/notes), `status`, `clientId`, paged (default `issueDate,desc`).
- `GET /api/quotations` — `q` (quotationNumber/notes), `status`, `clientId`, paged (default `issueDate,desc`).
- `GET /admin/users` — `q` (name/email/phone), `role`, `verified`, paged (default `createdAt,desc`).
- JPA `Specification` on each repo, inline lambda predicates in each service. Page size capped at 100.
- The previous unbounded `getAll*()` endpoints survive at `/api/services/all`, `/api/invoices/all`, `/api/quotations/all`, `/admin/users/all` for legacy use.

Backend cleanup: removed the placeholder `/admin/orders`, `/admin/services`, `/admin/invoices`, `/admin/quotations` endpoints from `AdminController` — they returned empty lists with `// TODO: Feign client` comments.

Frontend:
- New shared `<FilterableTable>` component (`src/components/admin/FilterableTable.jsx`) — debounced search (300 ms), per-column filter dropdowns, MUI `TablePagination`, react-query with `keepPreviousData` so paging doesn't blank the table.
- All 5 admin pages rewritten on top of it: `OrderManagement`, `UserManagement`, `ServiceManagement`, `InvoiceManagement`, `QuotationManagement`. `OrderManagement` previously had hardcoded mock data — now real.
- `services/api.js`: replaced `adminApi.getAllOrders/getAllInvoices/getAllQuotations/getAllServices` with `searchOrders/searchInvoices/searchQuotations/searchServices` hitting `/api/*` directly. `getAllUsers()` retained against `/admin/users/all` for `AdminDashboard` stats. `searchUsers` is the new paginated entry point.
- i18n: new `admin` namespace in `src/i18n/locales/{en,ar}/admin.json`, registered in `src/i18n/index.js`. Covers filter labels, table headers, and per-page strings.

Architectural finding (later addressed by #9): downstream microservices had `spring-boot-starter-security` on classpath but no `SecurityConfig` — relied on Spring Boot defaults. The gateway was the only auth boundary at this point.

---

## #8 — Admin approval UI for `PENDING_APPROVAL` work orders

Frontend-only follow-up to #5; backend endpoints already existed.

What shipped:
- `OrderManagement` page now defaults to the `PENDING_APPROVAL` queue (admins land where they need to act).
- Each `PENDING_APPROVAL` row shows **Approve** (green, instant) and **Reject** (opens a dialog for an optional reason). Other statuses keep the existing "Manage" button.
- After either action, the table auto-refreshes via react-query invalidation.
- `<FilterableTable>` extended with a `defaultFilters` prop so other admin pages can preset filters too.
- New i18n keys in `admin.json` (success toasts, dialog text, button labels) — EN + AR.

The service-request flow now closes end-to-end: client/tech submits → admin reviews → approve flips to `PENDING`, reject sets `CANCELLED` with reason → existing assignment + completion flows take over. Kafka events fire on approve/reject (built during #5).

---

## #9 — Per-service JWT auth retrofit

Locked best-practice decisions:
- Copy `JwtTokenProvider` + `JwtAuthenticationFilter` + `SecurityConfig` per module rather than extract a shared `security-common` library. Matches the established `client-module` / `technician-module` pattern, simpler diff, refactor to a shared module later if a 5th module needs auth.
- Bake `pwdIat` (epoch millis of last password change) into JWT issuance. Downstream services compare `iat >= pwdIat` and reject stale tokens — same security as the `client-module` DB lookup, but stateless (no DB call per request, downstream services don't need access to the `clients` table).

Token issuance updates (`client-module`):
- `JwtTokenProvider.generateToken(email, role, pwdChangedAtMillis)` overload — embeds `pwdIat` claim.
- `JwtAuthenticationFilter` updated to read `pwdIat` from the claim instead of the `clients` table — same security guarantee, faster, decoupled.
- `ClientDTO.passwordChangedAt` exposed; `ClientService.toDTO` maps it.
- `AuthenticationController` register + login now pass `pwdChangedAt` into token issuance.

Each of `work-order-module`, `service-module`, `invoice-module`, `vessel-module` got:
- `JwtTokenProvider` (validate-only, ~40 lines).
- `JwtAuthenticationFilter` (~80 lines, reads `pwdIat` from claim).
- `SecurityConfig` (CSRF off, CORS, stateless, JWT filter, `@EnableMethodSecurity`).

`service-module/pom.xml` gained `spring-boot-starter-security` (was missing). All 4 modules gained `jjwt-api` / `-impl` / `-jackson` 0.12.5.

Each module's `application.yml` gained `jwt.secret: ${JWT_SECRET:default}` so the secret rotates via env var consistently across all 6 services.

`@PreAuthorize` annotations on admin endpoints:
- `work-order`: `searchWorkOrders`, `approve`, `reject`, `assign`, `delete` → ADMIN; `updateStatus` → ADMIN+TECHNICIAN; `/my`, `POST`, `POST /service-request` → authenticated.
- `service`: `POST/PUT/DELETE` → ADMIN; `GET /api/services` → public (catalog); `GET /all` → ADMIN.
- `invoice` + `quotation`: `searchX`, `getAll`, `POST`, `PUT/{id}/status`, `DELETE` → ADMIN; `/my`, `/{id}`, `/{id}/pdf` → authenticated.
- `vessel`: `GET /api/vessels` (list-all) → ADMIN+TECHNICIAN; rest authenticated.

Live verification still pending (until full local stack is up):
- Boot `client-service` + 4 service modules + `gateway` + frontend with `JWT_SECRET` set to the same value across all six.
- `curl /api/work-orders` with no token → expect 401. With a CLIENT token → expect 403 (admin-only). With ADMIN token → 200.
- Change a password via `/auth/reset-password`, then re-use the **old** JWT against `/api/work-orders/my` → expect 401/403 because `iat < pwdIat`.
- Re-register a fresh user → first JWT works against all services.

Architectural notes flagged for follow-up:
- Vessel `PUT/DELETE /api/vessels/{id}` is authenticated-only with no ownership check — any logged-in user can edit any vessel.
- `POST /api/work-orders/service-request` trusts `clientId` from the request body — should verify it matches the JWT subject (or the vessel owner's id).

---

## #10 — Phone as primary identifier (Option A from the plan)

Locked best-practice decisions:
- Keep `id BIGSERIAL` as the SQL primary key. Phone becomes the **unique business identifier** users authenticate against. Phone numbers can change; using them as a SQL PK is a foreign-key cascade nightmare.
- Email stays required for now (until SMS OTP lands and phone-OTP can replace email-based password reset).
- JWT subject stays `email` for now (changing `sub` invalidates every active session and ripples through downstream services). Phone is added later as a claim if needed.
- Phone format: E.164 (`+9745…`), normalized at write time via `libphonenumber`. Default region QA.
- Login accepts phone OR email + password. Frontend auto-detects by format.
- Existing customers: their phones are normalized in place by V4. Already had `phone NOT NULL`, so the migration just adds the `UNIQUE` constraint after normalization.
- SMS OTP login = deferred to a separate Option-C task once an SMS provider is provisioned.

Backend (`client-module`):
- `PhoneNumberService` (Spring bean) wraps Google's `libphonenumber`, default region `QA`. `normalize(raw)` → E.164 (`+97412345678`) or throws `IllegalArgumentException`. The existing `GlobalExceptionHandler` already maps that to HTTP 400.
- Java Flyway migration `V4__normalize_phones_and_unique` (in `db.migration` package) — best-effort normalize every existing `clients.phone` to E.164, fail clearly if duplicates appear after normalization, then `ALTER TABLE clients ADD CONSTRAINT clients_phone_key UNIQUE (phone)` + index. Idempotent on retry.
- `Client.phone` annotated `unique = true`.
- `ClientRepository`: `findByPhone(phone)`, `existsByPhone(phone)`.
- `ClientService.createClient` / `updateClient` / `updateClientWithPassword` normalize phone via `PhoneNumberService` before persisting. Uniqueness collision → 400 "Phone already exists".
- `ClientService.findEmailByPhone(normalizedPhone)` — used by login to resolve a phone-keyed login back to the email-keyed `AuthenticationManager`.
- `AuthenticationController.login` accepts either `{phone, password}` or `{email, password}`. Phone path normalizes, looks up the email, then runs the existing email-keyed auth path. JWT internals unchanged (sub still email).

Backend deps: `client-module/pom.xml` gained `com.googlecode.libphonenumber:libphonenumber:8.13.50`.

Frontend:
- `services/api.js authApi.login(identifier, password)` — auto-detects phone vs email by presence of `@` and posts the right body shape.
- `AuthContext.login(identifier, password)` — signature renamed.
- `Login.jsx` single input labelled "Phone or email" with helper text and `dir="ltr"` so phone digits + email render correctly under Arabic too. `autoComplete="username"`.
- `Register.jsx` reordered: **phone first** (primary, with E.164 placeholder + helper text), email second (still required for password reset). Both `dir="ltr"` where appropriate.
- i18n: new `login.identifier` / `login.identifierHelper`, `register.phoneHelper`, `register.emailHelper` keys in EN + AR.

Live verification still pending (until full local stack is up):
- Run V4 against a non-empty DB. Expect logs showing how many phones were normalized + a clear error if duplicates surface.
- `curl -X POST /auth/login -d '{"phone":"+97412345678","password":"…"}'` → 200. With invalid phone → 401. With email path → 200 (regression check).
- Register with phone `12345678` (no country code) → backend normalizes to `+97412345678`. Register with `+97412345678` again → 400 "Phone already exists".

Decisions deferred (intentionally out of scope here):
- **JWT `sub` change to phone or `id`** — breaks every active session if flipped. Keeping email as `sub` for now.
- **SMS OTP** — Twilio Verify or similar. Once shipped, email becomes truly optional and email-based password reset can be sunset.
- **Phone change confirmation** — currently a logged-in user can change their phone via `PUT /auth/profile` without re-verification. SMS OTP is the right gate for that flow when it lands.

---

## #11 — Item 3: Used Boat Marketplace — Phase 1

Locked decisions baked in:
- **Bilingual content** (A1) — full EN + AR on `title`, `description`, `known_issues`, `inclusions`. Admin enters both; UI picks based on `i18n.language`.
- **Real `slug` column** (B1) — UNIQUE NOT NULL, auto-generated on create from `titleEn` + `id` (collision-free, two-phase save). Admin can override on update.
- **Nullable `listing_id` on inquiries** (C, best-practice) — DB CHECK enforces it for BUY/RENT/INSPECTION; GENERAL may omit. Service-layer 400 catches it before the SQL exception. One admin inbox handles every inquiry type.
- **Phase 1 Reserve / Make-offer / Book CTAs** — rendered but disabled with "Coming soon" tooltip; anchors them in the UI without half-built behavior.
- **Image storage** — admin pastes hosted URLs (one per line) for now; S3 + thumbnail pipeline is Phase 2.

Backend (`marketplace-module`):
- Flyway `V1__marketplace_schema.sql` (pre-existing scaffold) — `boat_listings` (status/seller_type/mode flags + sale_price/daily_rate/weekly_rate, captain options, full vessel specs, engine + equipment booleans, condition dates, location, registration, media URLs, view_count) and `boat_inquiries` (listing_id, inquiry_type enum BUY/RENT/INSPECTION/GENERAL, status enum NEW/IN_PROGRESS/CLOSED).
- Flyway `V2__bilingual_slug_and_general_inquiries.sql` (new) — adds `title_en/ar`, `description_en/ar`, `known_issues_en/ar`, `inclusions_en/ar`, `slug` (UNIQUE NOT NULL, indexed); backfills then drops the legacy single-locale columns; makes `boat_inquiries.listing_id` nullable with CHECK `ck_boat_inquiries_listing_required`.
- Entities `BoatListing` (`ListingStatus` DRAFT/AVAILABLE/RESERVED/SOLD/ARCHIVED, `SellerType` DEALER/PRIVATE, `CaptainRequired` NEVER/OPTIONAL/INCLUDED) and `BoatInquiry` updated for the new schema.
- `BoatListingService` — full CRUD, paged search via JPA `Specification` (mode BUY|RENT, q matches `titleEn`/`titleAr`/`descriptionEn`/`descriptionAr`/`brand`/`model`, `boatType`, length/year/price ranges, location text, optional `adminStatus` to bypass the public AVAILABLE+RESERVED filter); slug auto-generation in `create()` (slugify titleEn + id). New `getBySlug()`.
- `BoatInquiryService.create()` — friendly 400 when listing-bound types (BUY/RENT/INSPECTION) omit `listingId`; only checks listing existence when `listingId` is provided.
- Controllers: `GET /api/listings`, `GET /api/listings/{id}`, `GET /api/listings/by-slug/{slug}` (public); admin POST/PUT/DELETE under `@PreAuthorize("hasRole('ADMIN')")`. `POST /api/listings/inquiries` (public), admin GET + `PUT /api/listings/inquiries/{id}/status`.
- `SecurityConfig` — JWT filter, public GET on listings + slug + POST on inquiries; `@EnableMethodSecurity` for `@PreAuthorize`.
- `marketplace-module/pom.xml` — `spring-boot-starter-web/data-jpa/security/validation/actuator`, eureka client, postgres, flyway-core + flyway-database-postgresql, jjwt 0.12.5. Port 8086.

Gateway (`gateway-module/application.yml`):
- New route `marketplace-inquiry-create-ratelimit` matching `POST /api/listings/inquiries` only — IP-keyed strict limiter (replenishRate=1/sec, burstCapacity=3) anti-spam, declared **before** the general route so it wins on the predicate match.
- New route `marketplace-service` matching `/api/listings/**` — IP-keyed normal limiter (replenishRate=20/sec, burstCapacity=40), routes to `lb://marketplace-service`.

Frontend:
- `services/api.js` — new `marketplaceApi` (`searchListings`, `getListingById`, `getListingBySlug`, `createListing`, `updateListing`, `deleteListing`, `createInquiry`, `searchInquiries`, `updateInquiryStatus`).
- New `marketplace` i18n namespace in `src/i18n/locales/{en,ar}/marketplace.json` (full coverage: title/tagline, modes, filters, card, detail, specs, equipment, status, captain options, CTAs incl. comingSoon, inquiry form, admin labels). Registered in `src/i18n/index.js`. Navbar link key added.
- Reusable components under `src/components/marketplace/`:
  - `BoatCard.jsx` — `Grow` mount with index-staggered delay, hover `translateY(-4px)` + shadow lift, RTL-aware status-badge corner, primary-image fallback icon.
  - `BoatPhotoCarousel.jsx` — cross-fade + scale on slide change, prev/next buttons, animated dot indicators (8 → 24 px on selection).
  - `InquiryDialog.jsx` — `Slide direction="up"` modal, type select (restricted to GENERAL when `listingId` is null), submit via `marketplaceApi.createInquiry`, toast on success/error.
- Public pages under `src/pages/public/marketplace/`:
  - `BoatGallery.jsx` at `/boats` — Buy/Rent/All toggle in animated hero (linear gradient + Fade), filter sidebar (search, type, length/year/price ranges, location), paged grid with skeleton loaders during initial fetch and `keepPreviousData` for smooth filter transitions.
  - `BoatDetail.jsx` at `/boats/:slug` — animated photo carousel, Fade + Grow-staggered spec sections (basic → specs → engine + equipment → condition → documents at 0/150/250/350/450/550 ms), sticky CTA panel with live Contact + Request inspection and disabled Reserve / Make-offer / Book on "Coming soon" tooltips, equipment chips array, RTL-aware back arrow.
- Admin pages under `src/pages/admin/`:
  - `BoatListingManagement.jsx` at `/admin/boats` — `<FilterableTable>` with status + mode filters, edit/delete row actions, "New listing" CTA.
  - `BoatListingForm.jsx` at `/admin/boats/new` and `/admin/boats/:id/edit` — multi-section form (basic, mode + pricing, specs, engine + equipment, condition, location, documents, media). Bilingual title/description/known-issues/inclusions side by side. Rental fields disabled until `forRent` toggled. Date pickers for survey/antifoul/engine-service.
  - `BoatInquiryManagement.jsx` at `/admin/inquiries` — `<FilterableTable>` with status + type filters; inline status select per row uses `marketplaceApi.updateInquiryStatus` and invalidates the query on success.
- Routes wired in `App.jsx`. Navbar gains a Marketplace link (en + ar). `AdminLayout` nav gains Boats + Inquiries entries.

Animation pass (no new deps — MUI built-ins + Emotion CSS transitions only): hero Fade, card Grow with staggered delay, hover lifts, photo cross-fade + scale, dialog slide-up, dot indicators morph width, skeleton loaders. Captured as a feedback memory for future frontend work.

Verification:
- `mvn -pl marketplace-module -am clean compile` ✓
- `mvn -pl gateway-module -am compile` ✓
- `npm run build` ✓ (5.5 s)
- `npx eslint` on marketplace files → 0 errors (1 warning on `useEffect` complex-dep matches the existing `FilterableTable.jsx` pattern).

Live verification still pending (until full local stack is up):
- Bring up backend + gateway + frontend. Log in as ADMIN, create a listing under `/admin/boats/new` with `for_sale=true` and `for_rent=true` and bilingual titles + image URLs.
- Verify `/boats` Buy/Rent/All toggle, filters, card hover lifts, skeleton loaders.
- Open `/boats/:slug` detail, submit a Contact inquiry + a Request-inspection inquiry. Confirm `/admin/inquiries` lists both and the inline status select persists.
- Toggle language to Arabic, confirm RTL rendering on the detail page (carousel direction, sticky panel side, back arrow flips).
- Curl rate-limit check on `POST /api/listings/inquiries` (expect 429 after the 3-burst is drained).

Phase 2 (locked, deferred — blocks on Stripe + S3):
- Reserve-with-deposit Stripe Checkout (20% buy deposit per locked plan, 7-day TTL, refundable per cancellation policy).
- Rental booking calendar + `BoatRentalBooking` + `BoatAvailability`.
- S3 image upload + thumbnail pipeline.

Phase 3 (locked, deferred):
- Offer / negotiation flow.
- In-app inspection scheduling calendar.
- Contract e-sign, KYC.
- View counts, similar-listings recs, audit log per status transition.
- Favorites / saved searches.

Small follow-ups noted (not in the original cut):
- `BoatInquiry` has no `preferred_date` (for inspection) or `locale` (for admin reply context) — left out per the locked plan as nice-to-haves; address when wiring richer inquiry forms.
- Admin listing list has no bulk toggle for `for_sale`/`for_rent` — handled via the edit form for now.
- Pre-existing repo-wide lint errors (~456) are not from this work; cleanup is its own task if you want it.

### Smoke-test fixes shipped 2026-05-04

Bringing the local Docker stack up against `marketplace-service` for live verification surfaced a handful of pre-existing latent bugs and a couple of issues in this Phase 1 work. All fixed in the same session:

- **Per-module Flyway history tables** — all 8 backend modules shared one `flyway_schema_history` table by default, which only worked by coincidence (every module's V1 was a copy-pasted monolithic schema). Marketplace's unique V1 (`boat_listings` + `boat_inquiries`) collided on checksum, and client-service then failed with "Detected applied migration not resolved locally: 2" once work-order's V2 won the registration race. Fix: added `spring.flyway.table: flyway_schema_history_<module>` to all 8 application.yml files. Each module now owns its own history.
- **Marketplace baseline-version: 0** — with per-module history tables on a non-empty schema (other modules' tables already created when marketplace starts), the default `baseline-on-migrate=true` + `baseline-version=1` baselined V1 as already-applied without running it, so V2's ALTER TABLE hit a missing `boat_listings`. Set `baseline-version: 0` on marketplace so V1 actually runs.
- **Slug NOT NULL violation** — original `BoatListingService.create()` did a two-phase save (insert with null slug → set slug = slugify(titleEn)+id → save) but `slug` is `NOT NULL`, so the first insert violated the constraint. Rewritten to generate `slugify(titleEn) + "-" + UUID-8` before insert (one trip, collision-free without needing the post-insert id).
- **Client-service heap bump** — was being OOM-killed (exit 137) at the project default `-Xmx256m` because of the larger dep set (Mail + Redis + JPA + Security + Eureka). Bumped to `-Xmx512m -Xms256m` in docker-compose.yml.
- **Mail HealthIndicator disabled** — Spring Boot's mail starter probes the configured SMTP host at /actuator/health time, and our default points at `smtp.example.com`, dragging the aggregate health DOWN. Added `management.health.mail.enabled: false` to client-module's application.yml; mail still works via `LogMailSender` until SMTP is provisioned.
- **`marketplace-module` added to docker-compose + start scripts** — the new module wasn't listed in `docker-compose.yml`, `start-all-docker.sh`'s mvn `-pl` chain, or `start-dev.sh`'s service loop. Created `marketplace-module/Dockerfile` (mirroring invoice's), added a marketplace-service block to docker-compose, bumped the healthy-count threshold in start-all-docker.sh from 11 → 12, and added marketplace-module to the dev script. Marketplace runs on port 8088 (separates from technician-service which uses 8086 internally).
- **IllegalArgumentException → 400** — `BoatInquiryService.create` throws `IllegalArgumentException` when listing-bound types omit `listingId`. With no exception handler, Spring forwarded to `/error`, which security treated as a new (anonymous) protected request → 403. Added `MarketplaceExceptionHandler` (`@RestControllerAdvice`) to map `IllegalArgumentException` → 400 with the exception message in the body.

Smoke-test results (2026-05-04):
- POST /auth/register (role=ADMIN) → 200 + JWT ✓
- POST /api/listings → 200, slug auto-generated as `<titleEn>-<UUID-8>` ✓
- GET /api/listings/by-slug/{slug} → 200, bilingual fields preserved ✓
- GET /api/listings?mode=BUY → 200, paged content ✓
- POST /api/listings/inquiries (BUY + listingId) → 200, persisted ✓
- POST /api/listings/inquiries (GENERAL, no listingId) → 200, CHECK constraint allows ✓
- POST /api/listings/inquiries (BUY without listingId) → 400 (after handler fix) ✓

---

## #13 — Stripe webhook scaffold (Phase 0 payment infra)

Smallest viable Stripe scaffold so Phase 2 marketplace deposits + Item 2 shop checkouts can land later without rewiring infra. Inlined into `invoice-module` (no new microservice — invoice already owns money).

What shipped:
- `invoice-module/pom.xml` — added `com.stripe:stripe-java:27.0.0`.
- `invoice-module/.../payment/StripeWebhookController.java` — `POST /api/payments/webhooks/stripe`, reads raw body + `Stripe-Signature` header, calls `Webhook.constructEvent(payload, sig, secret)` for verification + parsing, switches on event type with stub handlers (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `checkout.session.completed`) that currently log + ack with 200. Returns 503 if `STRIPE_WEBHOOK_SECRET` is unset (fail-loudly), 400 on missing/invalid signature.
- `invoice-module/application.yml` — `stripe.secret-key` and `stripe.webhook-secret` properties, env-overridden via `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.
- `invoice-module/SecurityConfig.java` — `/api/payments/webhooks/stripe` permitted (Stripe authenticates via signature, not JWT).
- `gateway-module/application.yml` — `payments-stripe-webhook` route: `POST /api/payments/webhooks/stripe` → `lb://invoice-service`, IP-keyed rate limit (50/sec, burst 100) generous enough to absorb event replays without 5xx-triggering retries.
- `docker-compose.yml` — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars on `invoice-service`, defaulting to empty so the stack still starts without Stripe creds.

Verification:
- `mvn -pl invoice-module -am clean compile` ✓ (25 s).
- Endpoint behavior verified by code review; live verification needs Stripe CLI (`stripe listen --forward-to localhost:8080/api/payments/webhooks/stripe`) once a Stripe test account is provisioned.

Explicitly NOT in scope (deferred to Phase 2):
- Stripe API calls outbound (creating PaymentIntent / Checkout Session). Will land when wiring deposit + booking + shop flows.
- Idempotency table for processed `event.id`s. Add when handlers do real work (writes to DB shouldn't double-run on Stripe retry).
- MyFatoorah / Tap (Qatar local processors). Same shape, separate webhook endpoint when provisioned.

To go live: provision a Stripe test account, copy `sk_test_…` and run `stripe listen` to get `whsec_…`, set both as env vars, restart `invoice-service`.
