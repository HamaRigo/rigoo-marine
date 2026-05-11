# Rigoo Marine

Bilingual (English + Arabic, RTL) marine services platform for the Qatar market: service requests against vessels, parts & tools shop with Stripe checkout, used-boat marketplace, role-based dashboards for clients, technicians, and admins. Single base currency: **QAR**.

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────────────────────────┐
│   Frontend  │────▶│ API Gateway  │────▶│  10 backend services (Eureka-discovered)│
│  (React/MUI)│     │  (port 8080) │     │  client · vessel · service · work-order │
└─────────────┘     └──────┬───────┘     │  technician · invoice · notification    │
                           │             │  marketplace · shop · discovery         │
                           ▼             └────────────────────────────────────────┘
                    ┌─────────────┐                │
                    │   Eureka    │      ┌─────────┴──────────┬───────────┐
                    │   (8761)    │      ▼                    ▼           ▼
                    └─────────────┘ ┌──────────┐       ┌──────────┐  ┌─────────┐
                                    │ Postgres │       │  Kafka   │  │  Redis  │
                                    │  (5432)  │       │  (9092)  │  │ (6379)  │
                                    └──────────┘       └──────────┘  └─────────┘
```

For request flow, payment flow, Kafka topics, JWT model, and per-service responsibilities, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Services

| Service | Port | Purpose |
|---|---|---|
| `discovery-service` | 8761 | Netflix Eureka registry |
| `api-gateway` | 8080 | Spring Cloud Gateway — routing, Redis-backed rate limiting, CORS |
| `client-service` | 8081 | Auth (JWT issuance), users, email verification, password reset; phone-as-primary-identifier (E.164, libphonenumber) |
| `vessel-service` | 8082 | Vessel registry |
| `service-service` | 8083 | Service catalog |
| `work-order-service` | 8084 | Service requests, approval workflow, status transitions; emits Kafka events |
| `invoice-service` | 8085 | Invoices, quotations, **Stripe webhook ingest** (idempotent), PDF export |
| `technician-service` | 8086 | Technician profiles, dashboard endpoints |
| `notification-service` | 8087 | Email templates (EN+AR), Kafka consumer for `shop.order.status`, mail send via `LogMailSender` (dev) or `SmtpMailSender` (prod, gated by `MAIL_ENABLED`) |
| `marketplace-service` | 8088 | Used-boat listings + inquiries, bilingual content + slug |
| `shop-service` | 8089 | Parts & tools catalog, cart, **Stripe Checkout creation**, order lifecycle, admin order inbox; emits Kafka `shop.order.status` |
| `frontend` | 80 | React 18 + Vite + MUI; React Query; bilingual EN+AR with Emotion RTL |

`config-server/` is scaffolded but not deployed — services read config from their own `application.yml` plus env vars. ELK (Elasticsearch/Logstash/Kibana/Filebeat) is wired in `docker-compose.yml` but commented out by default to conserve dev memory.

## Quick start

Run the whole stack with one command:

```bash
./start-all-docker.sh
```

That builds backend modules with Maven, builds the frontend, brings up all 13 containers via `docker compose`, and waits for healthchecks. Then open:

- Frontend: http://localhost
- API Gateway: http://localhost:8080
- Eureka: http://localhost:8761

For dev mode (infrastructure in Docker, services run locally with `mvn spring-boot:run` and `npm run dev`), use `./start-dev.sh`.

Detailed walkthroughs: [QUICKSTART.md](./QUICKSTART.md) (5-minute path) and [RUN_LOCAL.md](./RUN_LOCAL.md) (long-form, including running services individually in IDE).

## Environment variables

Copy `.env.example` → `.env` and fill in real values. The most load-bearing knobs:

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `DB_USERNAME` / `DB_PASSWORD` | `postgres` / `postgres` | all data services | Production: switch to least-privilege `rigoomarine_app` user — see [`rigoo-marine-backend/SECURITY_DATABASE.md`](./rigoo-marine-backend/SECURITY_DATABASE.md) |
| `JWT_SECRET` | `default` | client, work-order, service, invoice, vessel | **Must match across all services**. Generate with `openssl rand -base64 64`. |
| `STRIPE_SECRET_KEY` | empty | invoice, shop | When blank, shop checkout returns `503 payments not configured` instead of failing hard |
| `STRIPE_WEBHOOK_SECRET` | empty | invoice | Required for webhook signature verification |
| `INTERNAL_API_TOKEN` | `rigoo-internal-token-change-in-production` | invoice, shop | Shared secret for the `invoice → shop` callback path (see ARCHITECTURE) |
| `FRONTEND_BASE_URL` | `http://localhost` | shop | Used to build Stripe Checkout success/cancel URLs |
| `MAIL_ENABLED` | `false` | notification, client | When `false`, emails write to logs (`LogMailSender`); when `true`, real SMTP send |
| `SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD` / `MAIL_FROM` | empty | notification, client | Required when `MAIL_ENABLED=true` |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | work-order, shop, notification | Kafka topics: `service-request.*`, `shop.order.status` |

## Tech stack

**Backend** — Java 17, Spring Boot 3.2, Spring Cloud Gateway + Eureka, Spring Security (JWT in every service), Spring Data JPA + Flyway (per-module `flyway_schema_history_<module>`), PostgreSQL 15, Redis 7, Kafka 7.4 (Confluent), Stripe Java SDK 27, Google libphonenumber, Maven multi-module.

**Frontend** — React 18, Vite, Material-UI, TanStack Query, React Router, Axios, react-i18next + browser-language-detector, Emotion + `stylis-plugin-rtl` for Arabic RTL.

**Infrastructure** — Docker Compose for the full stack; healthcheck-gated startup ordering; ELK stack scaffolded (commented out).

## Documentation

| Doc | What's in it |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Service map, request flow, Stripe webhook + Kafka order-paid path, JWT model, i18n architecture, Flyway strategy |
| [`QUICKSTART.md`](./QUICKSTART.md) | 5-minute getting-started |
| [`RUN_LOCAL.md`](./RUN_LOCAL.md) | Detailed local setup, including running services individually |
| [`rigoo-marine-backend/SECURITY_DATABASE.md`](./rigoo-marine-backend/SECURITY_DATABASE.md) | DB connection security: TLS, least-privilege user, HikariCP tuning, audit logging |
| [`MOBILE_PLAN.md`](./MOBILE_PLAN.md) | React Native + Expo plan (not started) |
| [`DONE_WORK.md`](./DONE_WORK.md) | Authoritative archive of shipped work, sprint-by-sprint |
| [`CICD_SETUP_TASKS.md`](./CICD_SETUP_TASKS.md) | Docker Hub + GitHub Actions setup checklist |

## Project layout

```
rigoo-marine-backend/         Maven multi-module backend
├── discovery-service/        Eureka server
├── gateway-module/           Spring Cloud Gateway (routes + rate limits)
├── client-module/            Auth, users, email/password flows
├── vessel-module/            Vessel registry
├── service-module/           Service catalog
├── work-order-module/        Service requests + approval + status events
├── technician-module/        Technician profiles + dashboard
├── invoice-module/           Invoices, Stripe webhooks (idempotent)
├── notification-module/      Email templates + Kafka consumer + mail send
├── marketplace-module/       Used-boat listings + inquiries
├── shop-module/              Parts & tools catalog + cart + checkout
├── config-server/            Scaffolded, not deployed
└── db/                       SQL helpers (security/least-priv user setup)

rigoo-marine-frontend/        React 18 + Vite
└── src/
    ├── pages/{public,auth,dashboard,admin,technician,workorder,error}/
    ├── components/{common,layout,marketplace,shop}/
    ├── services/api.js       Axios + per-domain clients (authApi, shopApi, ...)
    ├── i18n/locales/{en,ar}/ Per-namespace JSON: common, navbar, home, auth,
    │                         workorder, admin, marketplace, shop
    └── hooks/, context/, theme.js (with buildTheme(direction) for RTL)

docker-compose.yml            Full prod-shape stack
docker-compose.dev.yml        Infra only (Postgres + Kafka + Redis)
start-all-docker.sh           One-shot: build + compose up + wait-healthy
start-dev.sh                  Infra + dev-mode helpers
.github/workflows/            CI/CD (Backend + Frontend → Docker Hub)
```

## License

MIT
