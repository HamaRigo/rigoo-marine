# Architecture

How the Rigoo Marine platform is wired together: services, request flow, auth, payments, eventing, and the cross-cutting concerns (i18n, migrations, rate limiting). Read this when you're new to the codebase or you're about to touch something that crosses service boundaries.

For "what is this project", see [`README.md`](./README.md). For shipped-feature history, see [`DONE_WORK.md`](./DONE_WORK.md).

---

## 1. Service map

Three layers: edge (gateway + discovery), domain services, and infra (Postgres, Kafka, Redis).

```
                                   ┌──────────────────────────────────────────────┐
                                   │             Browser (React/MUI/i18n)         │
                                   └─────────────────┬────────────────────────────┘
                                                     │ HTTPS · JWT in Authorization header
                                                     ▼
                                   ┌──────────────────────────────────────────────┐
                                   │  api-gateway (8080)                          │
                                   │  · Spring Cloud Gateway                      │
                                   │  · Eureka-discovered routing (lb://)         │
                                   │  · Redis-backed rate limiting (per-IP/user)  │
                                   │  · CORS                                      │
                                   └────────────────┬─────────────────────────────┘
                                                    │ load-balanced via Eureka
   ┌────────────────────────────────────────────────┼───────────────────────────────────────┐
   ▼                ▼                ▼              ▼              ▼              ▼          ▼
┌───────┐   ┌───────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐
│client │   │  vessel   │   │  work-order  │   │ invoice  │   │ marketplace│   │     shop     │
│ 8081  │   │   8082    │   │     8084     │   │   8085   │   │    8088    │   │     8089     │
│ auth  │   │  vessels  │   │ requests +   │   │ Stripe   │   │ boats +    │   │ products +   │
│ users │   │           │   │ approval     │   │ webhook  │   │ inquiries  │   │ cart + ckout │
└───┬───┘   └─────┬─────┘   └──────┬───────┘   └────┬─────┘   └──────┬─────┘   └──────┬───────┘
    │             │                 │                │                │                 │
    │             │                 │ Kafka          │ HTTP callback (Eureka, internal token)
    │             │                 │ service-       │                │                 │ Kafka
    │             │                 │ request.*      └─────────────▶  │                 │ shop.order.status
    │             │                 │                                 │                 │
    └─────────────┴─────────────────┼─────────────────────────────────┴─────────────────┤
                                    │                                                   │
                                    ▼                                                   ▼
                          ┌────────────────┐                                  ┌──────────────────┐
                          │  notification  │◀─── Kafka shop.order.status ─────│   service +      │
                          │      8087      │                                  │   discovery 8761 │
                          │  templates +   │                                  │  (Eureka)        │
                          │  mail send     │                                  └──────────────────┘
                          └───────┬────────┘
                                  │ SmtpMailSender (when MAIL_ENABLED=true)
                                  │ LogMailSender  (default — writes to stdout)
                                  ▼
                              SMTP server

Infra: PostgreSQL (5432, internal-only), Redis (6379), Kafka+Zookeeper (9092), all on the
`marine-network` Docker bridge. ELK stack scaffolded in compose, commented out by default.
```

Each domain service has its own Postgres schema namespace tracked by a per-module Flyway history table (`flyway_schema_history_<module>`) — see §6. The Postgres container is **not** exposed externally; everything goes through the gateway.

---

## 2. Request flow

A typical authenticated browser request:

1. **Browser** sends `GET /api/work-orders` with `Authorization: Bearer <jwt>`.
2. **Gateway** matches the route predicate (`Path=/api/work-orders/**`), applies the per-route rate limit (Redis bucket keyed by JWT subject via `userKeyResolver`, or by IP via `ipKeyResolver` for public endpoints), and forwards to `lb://work-order-service`.
3. **Eureka** resolves `work-order-service` to a live instance and the gateway forwards the request, preserving the `Authorization` header.
4. **Work-order service** runs the request through its own `JwtAuthenticationFilter` (validate-only — does not mint tokens), populates `SecurityContextHolder`, and `@PreAuthorize` enforces the role check at the controller.
5. The service hits its Postgres tables and returns JSON.

Public endpoints (the marketplace catalog, shop catalog, login, password reset, Stripe webhook) skip step 4's auth check but still get rate-limited at the gateway.

The gateway never authenticates — every downstream service does its own JWT validation. This means the JWT secret has to match across all services issuing or validating tokens (see §3).

---

## 3. Authentication & authorization

### Token issuance (client-service only)

`client-service` is the only token issuer. Login accepts **phone or email** as the identifier (`POST /api/auth/login`):

- The frontend's `authApi.login(identifier, password)` auto-detects which it is and posts the matching field.
- `client-service` looks up the user (phones are E.164-normalized via Google libphonenumber), verifies the password, and issues a JWT.
- The JWT carries claims: `sub` (currently email — see backlog item to migrate to phone or `id`), `roles`, `iat`, and `pwdIat` (the user's `password_changed_at` timestamp at issuance time).

### Token validation (every other service)

Every downstream service ships its own `JwtTokenProvider` (validate-only — no signing keys baked in beyond the shared secret) and `JwtAuthenticationFilter`:

- All services read `jwt.secret` from `JWT_SECRET` env var. **Must be identical across services**, otherwise downstream services reject tokens with HS256 signature failure.
- The filter rejects any token whose `iat < pwdIat` (server-side stateless logout when a password is changed — no DB round-trip, no Redis blacklist).
- `@PreAuthorize` enforces roles at the controller level. Common patterns: `hasRole('ADMIN')` on management endpoints, `hasAnyRole('ADMIN','TECHNICIAN')` on assignment endpoints, `isAuthenticated()` on user-owned resources (`/my`, owner-checked GETs).

### Email verification & password reset

Tokens are 256-bit URL-safe random, **stored hashed (SHA-256)**, with TTLs (24h for email-verify, 15min for password-reset). Single-use. Reset bumps `password_changed_at`, which invalidates all currently-issued JWTs via the `pwdIat` mechanism above. Implementation lives in `client-module` (`AuthService`, `TokenService`).

### What's intentionally not implemented yet

- **SMS OTP** (Twilio Verify) — planned, would let email become optional.
- **Vessel ownership check** on `PUT/DELETE /api/vessels/{id}` — currently any authenticated user can edit any vessel.
- **Service-request ownership check** on `POST /api/work-orders/service-request` — same.
- **Server-side token revocation list** (Redis) — `pwdIat` covers password-change; explicit logout is currently client-side only.

---

## 4. Payments — Stripe webhook flow

Two services are involved: `shop-service` creates Checkout sessions and owns orders, `invoice-service` owns the webhook endpoint and relays back. This split lets us reuse the `invoice-service` webhook for marketplace boat-deposit payments later (planned Phase 2).

### Outbound: shop creates a Checkout session

```
Browser ──▶ POST /api/orders/checkout ──▶ shop-service.OrderService.checkout(userEmail)
                                            │
                                            ├─ if STRIPE_SECRET_KEY blank → 503 PaymentNotConfigured
                                            ├─ stock validate (per cart item) → 409 StockConflict if any short
                                            ├─ INSERT order (status=PENDING_PAYMENT) — captures stable orderId
                                            ├─ Stripe Session.create(...) with line items in fils,
                                            │     metadata={orderId, orderNumber, source=SHOP},
                                            │     success_url/cancel_url pointing at FRONTEND_BASE_URL
                                            └─ UPDATE order SET stripe_session_id = ?
                                            
                              ◀─── { orderId, orderNumber, checkoutUrl, sessionId }
Browser redirects to checkoutUrl (Stripe-hosted page).
```

### Inbound: Stripe → invoice-service webhook → shop-service callback

```
Stripe ──▶ POST /api/payments/webhooks/stripe ──▶ invoice-service.StripeWebhookController
                                                    │
                                                    ├─ Webhook.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET)
                                                    │     └ signature mismatch → 400, no further action
                                                    │
                                                    ├─ INSERT processed_stripe_events (event.id) — idempotency table
                                                    │     └ DataIntegrityViolationException (duplicate) → 200 ack, skip handler
                                                    │
                                                    ├─ switch (event.type)
                                                    │     ├─ checkout.session.completed
                                                    │     │     └─ if metadata.source == "SHOP" →
                                                    │     │           ShopCallbackClient.notifyCheckoutCompleted(sessionId, paymentIntentId)
                                                    │     ├─ checkout.session.expired
                                                    │     │     └─ ShopCallbackClient.notifyCheckoutCancelled(sessionId)
                                                    │     ├─ payment_intent.payment_failed → cancelled
                                                    │     └─ charge.refunded → logged (Phase 3)
                                                    │
                                                    └─ handler exception → DELETE the idempotency row, return 500
                                                          (so Stripe's retry actually re-runs the handler next time)
```

`ShopCallbackClient` uses a `@LoadBalanced RestTemplate` to resolve `lb://shop-service` via Eureka and POSTs to `/api/internal/orders/checkout-{completed,cancelled}` with an `X-Internal-Api-Token: $INTERNAL_API_TOKEN` header. The shop-side `InternalOrderController` validates the token at the controller level (the `/api/internal/**` path is permitted at the security filter level so JWT auth doesn't run on it).

### shop-service marks the order PAID

```
shop-service.OrderService.markPaid(sessionId, paymentIntentId)  @Retryable(OptimisticLockException, maxAttempts=4)
    ├─ load order by sessionId
    ├─ if status == PAID → return (idempotent, already done)
    ├─ for each OrderItem: decrement product.stockQty (Product has @Version — optimistic lock)
    │     └─ if stock < requested (admin edited between checkout and webhook) → cap at 0, log error
    ├─ UPDATE order SET status=PAID, paid_at=now()
    ├─ DELETE the user's cart
    └─ OrderEventPublisher.publishOrderPaid(order) → Kafka shop.order.status
```

### Why this shape

- **Idempotency** — Stripe retries on any non-2xx, and webhook delivery is at-least-once. The `processed_stripe_events` table dedupes by `event.id`. Deleting on handler failure is what makes retries actually work — without that, a transient downstream failure would be silently absorbed as "already processed" on retry.
- **Stock validation before Stripe Session creation** — refunding Stripe is expensive and noisy. Catching the conflict before sending the user to the payment page returns a friendly `409 { conflicts: [...] }` to the cart drawer instead.
- **`@Version` optimistic lock + `@Retryable`** — handles the rare race where two webhooks arrive within ms of each other (admin replays an event, etc.). 4 attempts × 50ms backoff×2 covers normal contention without holding row locks.
- **Best-effort Kafka send** — Kafka `send(...)` failures inside `markPaid` are caught and logged. The DB transition is authoritative; the email is a downstream nice-to-have, not a correctness condition.

### Going live with Stripe

1. Stripe dashboard → copy `sk_test_…` → set `STRIPE_SECRET_KEY` (both `shop-service` and `invoice-service`).
2. Local dev: `stripe listen --forward-to http://localhost:8080/api/payments/webhooks/stripe` → copy `whsec_…` → set `STRIPE_WEBHOOK_SECRET` on `invoice-service`.
3. Set `INTERNAL_API_TOKEN` to the same value across `shop-service` and `invoice-service`.
4. Set `FRONTEND_BASE_URL` to the public origin (e.g. `http://localhost` for dev, your prod domain otherwise).
5. Restart `shop-service` + `invoice-service`. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Until Stripe is configured, `/api/orders/checkout` returns `503 payments not configured` — the rest of the stack boots cleanly.

---

## 5. Eventing — Kafka topics

| Topic | Producer | Consumer(s) | Payload (flat DTO, JSON) | Purpose |
|---|---|---|---|---|
| `service-request.submitted` | work-order-service | (no consumer wired yet — for future notification + admin dashboard push) | WorkOrder snapshot | Client/technician submitted a service request |
| `service-request.approved` | work-order-service | (future) | WorkOrder snapshot | Admin approved a pending request |
| `service-request.rejected` | work-order-service | (future) | WorkOrder snapshot + reason | Admin rejected with optional reason |
| `shop.order.status` | shop-service | notification-service | `ShopOrderEvent { type, orderId, orderNumber, userEmail, status, totalQar, currency, itemCount, occurredAt }` | Order PAID / CANCELLED — drives the order-confirmation email |

The `ShopOrderEvent` DTO lives in `shop-module` but consumers receive it as `Map<String, Object>` (Spring Kafka `JsonDeserializer` with `spring.json.value.default.type=java.util.LinkedHashMap`) so they don't need shop-module classes on classpath.

`notification-service.ShopOrderEventConsumer`:
- `@KafkaListener(topics = "shop.order.status", groupId = "notification-shop-orders")`
- For `type == ORDER_PAID`, looks up the bilingual `ORDER_PAID` template (`EmailTemplateService` — picks AR or EN columns based on locale; currently hardcoded EN until `preferred_language` lands on `clients`), renders `{{orderNumber}}/{{totalQar}}/{{currency}}/{{itemCount}}` placeholders, dispatches via `MailSender`.

`MailSender` is one of two beans, gated by `@ConditionalOnProperty(app.mail.enabled=…)`:
- `LogMailSender` (default, `matchIfMissing=true`) — writes the email to stdout; useful in dev.
- `SmtpMailSender` (active when `MAIL_ENABLED=true`) — Spring Mail via configured SMTP creds.

Flipping `MAIL_ENABLED=true` switches at startup, no code change.

---

## 6. Database & Flyway

One Postgres database (`rigoomarine`) shared by all services. Each module owns its own tables and its own Flyway history table.

```yaml
# Each module's application.yml:
spring:
  flyway:
    table: flyway_schema_history_<module>   # e.g. flyway_schema_history_shop
```

Why per-module history: Spring Boot's default is `flyway_schema_history`, and when multiple modules share a DB they all try to claim it — first one wins, others fail to start or silently conflict. This was the smoke-test fix in `DONE_WORK.md` #12.

The `marketplace-module` additionally sets `spring.flyway.baseline-version: 0` so its V1 actually runs against an already-non-empty schema (other modules' tables present).

Migration conventions:
- `V1__<module>_schema.sql` — initial schema for the module
- `V2__<feature>.sql`, `V3__…` — incremental
- All include `WHERE NOT EXISTS` guards on data seeds (templates, default services) so they're safe to re-run on a fresh DB
- DB-level `CHECK` constraints back service-layer validation (e.g. shop product `category IN ('PART','TOOL')`, inquiry `product_required-when-bound`) — defense in depth for direct SQL access

Production database setup is in [`rigoo-marine-backend/SECURITY_DATABASE.md`](./rigoo-marine-backend/SECURITY_DATABASE.md): least-privilege `rigoomarine_app` user (no DDL), `sslmode=verify-full`, HikariCP pooling.

---

## 7. Internationalization (EN + AR + RTL)

Qatar market → bilingual + RTL is non-negotiable. The platform handles it in three places:

### Frontend

- `react-i18next` + `i18next-browser-languagedetector`. Persists the choice to `rigoo.lang` in `localStorage`.
- On language change, syncs `<html lang>` and `<html dir>`.
- `src/i18n/DirectionProvider.jsx` — Emotion `stylis-plugin-rtl` cache + MUI `direction` rebuild. Theme is rebuilt via `theme.js`'s `buildTheme(direction)`.
- Per-namespace JSON: `common`, `navbar`, `home`, `auth`, `workorder`, `admin`, `marketplace`, `shop` (each with `en/` and `ar/` versions).
- Components use MUI `Fade`/`Grow`/`Slide` for animation (no framer-motion). RTL-aware logic: anchor sides flip (cart drawer left in AR, right in EN), back arrow flips, status badge corners flip.

### Backend bilingual content

- **Domain entities** with bilingual fields directly on the table: `Product.nameEn/nameAr/descriptionEn/descriptionAr/specsEn/specsAr`, `BoatListing.titleEn/titleAr/...`. UI picks based on `i18n.language` — admin enters both at create time.
- **Slugs** are generated from English title/name: `slugify(nameEn) + "-" + UUID-8` before insert. Single-trip, no two-phase save. Consequence of #12 smoke-test fix.

### Email templates

- `email_templates` table (in `client-module` and `notification-module`) with `subject_en/subject_ar/body_en/body_ar` columns.
- `EmailTemplateService.render(name, locale, vars)` picks AR/EN columns based on the supplied locale, substitutes `{{placeholders}}`.
- Currently seeded: `EMAIL_VERIFY`, `PASSWORD_RESET` (both bilingual), `ORDER_PAID` (bilingual).

### What's still partial

The frontend i18n is foundation-complete (Home, Login, Register, Navbar fully translated; new `marketplace` and `shop` namespaces 100% covered). Several older pages are still EN-only — public pages (Services, Gallery, About, Footer), dashboard, admin, and technician pages need translation, plus React-hot-toast strings. Backend Spring `MessageSource` for validation messages is also pending.

Backend Spring `MessageSource` for validation messages and stable `errorCode` API responses are also planned but not shipped.

---

## 8. Rate limiting

All limits are Redis-backed token buckets at the gateway. Two key resolvers:

- `ipKeyResolver` — for unauthenticated endpoints (login, signup, public catalog, Stripe webhook).
- `userKeyResolver` — for authenticated endpoints (cart, orders, work-order CRUD, dashboard).

| Route group | Replenish/sec | Burst | Resolver | Notes |
|---|---|---|---|---|
| `/auth/login` | 1 | 5 | IP | Anti-credential-stuffing |
| `/auth/forgot-password` | 1 | 3 | IP | Anti-spam on reset emails |
| `/auth/reset-password` | 1 | 5 | IP | Anti-bruteforce on reset tokens |
| `POST /api/work-orders/service-request` | 1 | 3 | user | Anti-spam on requests |
| `POST /api/listings/inquiries` | 1 | 3 | IP | Anti-spam, declared **before** the general listings route so it wins on predicate match |
| `POST /api/products/inquiries` | 1 | 3 | IP | Same shape as marketplace |
| `POST /api/orders/checkout` | 1 | 5 | user | Anti-abuse on Stripe Session creation |
| `POST /api/payments/webhooks/stripe` | 50 | 100 | IP | Generous — Stripe retries on 5xx, don't drop |
| Catalog reads (`/api/services`, `/api/listings/**`, `/api/products/**`) | 20 | 40 | IP | Public browse |
| Cart + orders + admin orders | 10 | 20 | user | Normal authenticated |
| User-owned services (`/api/clients`, `/api/vessels`, `/api/work-orders`, `/api/technicians`, `/api/notifications`) | 10 | 20 | user | Normal authenticated |

**Route ordering matters** — Spring Cloud Gateway picks the first matching predicate. The strict `/api/listings/inquiries` and `/api/products/inquiries` POST routes are declared *before* the broader `/api/listings/**` and `/api/products/**` routes, so the strict limit wins on the POST predicate.

---

## 9. Environment variable reference

Every service reads its config from `application.yml` (with env-var overrides) plus its slice of the env. The full list lives in `.env.example`; what follows is the cross-cutting picture.

| Variable | Required when | Used by | If unset |
|---|---|---|---|
| `JWT_SECRET` | always | client, work-order, service, invoice, vessel, marketplace, shop | Default `default` — fine in dev, replace in prod. Must match across services. |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | always | every Spring Boot service | `http://localhost:8761/eureka/` — overridden in compose to use the container hostname |
| `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` | always | every data service | compose defaults to internal `postgres:5432` |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | when emitting/consuming events | work-order, shop, notification | `kafka:29092` in compose |
| `REDIS_HOST/PORT` | always | gateway (rate limiting), client (caching) | `redis:6379` in compose |
| `STRIPE_SECRET_KEY` | live payments | invoice, shop | empty → shop checkout returns 503 |
| `STRIPE_WEBHOOK_SECRET` | live payments | invoice | empty → webhook signature check fails on every event |
| `INTERNAL_API_TOKEN` | live payments | invoice, shop | shared secret for the invoice→shop callback. Must match. Default placeholder is fine for dev. |
| `FRONTEND_BASE_URL` | live payments | shop | Used to build Stripe success/cancel URLs |
| `MAIL_ENABLED` | live emails | notification, client | `false` → `LogMailSender` writes to stdout |
| `SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD`, `MAIL_FROM` | live emails | notification, client | required when `MAIL_ENABLED=true` |
| `JAVA_TOOL_OPTIONS` | always | every Java service | per-service heap; client-service is 512m, shop & notification 384m, others 256m |
| `DB_SSL_ENABLED` | production | client (and prod profile in others) | `false` for local dev; `true` requires `sslmode=verify-full` against PG with TLS |

---

## 10. Where to add things

| You want to… | Where it goes |
|---|---|
| Add a new domain (e.g. "charters") | New `<name>-module/` with its own `pom.xml`, `Dockerfile`, `application.yml`, Flyway `V1__<name>_schema.sql` with `flyway_schema_history_<name>` table. Add to root `pom.xml` `<modules>`, to `docker-compose.yml`, to `start-all-docker.sh` (mvn list + healthy threshold), to `start-dev.sh`. Add gateway routes (rate limits + path predicates). Add JWT filter (copy from another module) for protected endpoints. Add an `<X>ExceptionHandler` mapping `IllegalArgumentException → 400`. |
| Add a new bilingual content field | Add `_en` and `_ar` columns in a new Flyway migration. Add both to the entity + DTO. Frontend chooses via `i18n.language`. |
| Add a new email | Insert into `email_templates` (subject_en/ar + body_en/ar with `{{placeholders}}`) in a Flyway seed migration. Render via `EmailTemplateService`. |
| Add a new Kafka event | Define a flat DTO so consumers don't need producer's classes. Producer publishes via `KafkaTemplate<String, Object>` with a try/catch (DB state is authoritative — events are best-effort). Consumer uses `@KafkaListener` reading `Map<String, Object>` for loose coupling. |
| Add a Stripe-paid surface (e.g. boat deposit) | Reuse `processed_stripe_events`. Set `metadata.source` distinctly (e.g. `MARKETPLACE_DEPOSIT`). Generalize `ShopCallbackClient` per source. Same idempotency + retry pattern. |
| Add a new public endpoint | Two routes in `gateway-module/application.yml`: a strict POST limiter (if anti-spam matters), then the general route. Strict route declared **first**. Service-side: add the path to its `SecurityConfig` permitAll list. |

---

_Last updated: 2026-05-05 (after shop Phase 2.1 + Kafka order-paid email landed)._
