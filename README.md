# Rigoo Marine

**Bilingual marine services platform for the Qatar market** — English and Arabic (RTL), single base currency **QAR**.

Rigoo Marine connects boat owners, technicians, and operations staff in one place: register vessels, request and track marine services, buy parts and tools, browse used-boat listings, manage invoices, and run field delivery and maintenance workflows. The stack is a React SPA fronting a Spring Cloud microservices backend, deployed with Docker Compose on Oracle Cloud and optionally on Vercel for the frontend.

| Surface | URL (production) |
|---|---|
| Website | [rigoomarine.com](https://rigoomarine.com) |
| API | [api.rigoomarine.com](https://api.rigoomarine.com) |

---

## Features

### Public

- **Services catalog** — browse marine services and submit service requests
- **Used-boat marketplace** — bilingual listings with slug URLs, gallery, and inquiry form
- **Parts & tools shop** — product catalog, cart, Stripe Checkout (when configured)
- **Team requests** — public form for partnership / team inquiries
- **i18n** — English + Arabic with RTL layout via Emotion and `stylis-plugin-rtl`

### Client (`CLIENT`)

- Vessel registry and account management
- Service request submission and order tracking
- Shop cart, checkout, and order history
- Own boat marketplace listings
- Notifications and profile

### Technician (`TECHNICIAN`)

- Work-order queue, detail, and history
- Inventory view and team-request responses

### Team lead (`TEAM_LEAD`)

- Approval workflow for service requests
- Order and invoice/quotation management
- Technician oversight, inspections, and delivery coordination

### Delivery driver (`DELIVERY`)

- Task list, route map (Leaflet), proof-of-delivery uploads, history

### Admin (`ADMIN`)

- Operations hub (work orders, services, inventory)
- Finance hub (invoices, quotations)
- Fleet hub (maintenance schedules, vessel inspections)
- Marketplace hub (boats, inquiries, products, shop orders)
- People hub (users, team requests, audit log)
- Content hub (team, gallery, media, contact info)
- Delivery tracking, analytics, and system settings (SMTP, etc.)

---

## Architecture

```
┌──────────────────┐     ┌───────────────┐     ┌─────────────────────────────────────────────┐
│  React frontend  │────▶│  API Gateway  │────▶│  12 domain services (Eureka-discovered)     │
│  Vite + MUI      │     │  port 8080    │     │  client · vessel · service · work-order     │
│  Vercel or :3080 │     │  rate limits  │     │  technician · invoice · notification        │
└──────────────────┘     └───────┬───────┘     │  marketplace · shop · delivery · maintenance│
                                 │             └─────────────────────────────────────────────┘
                                 ▼                              │
                          ┌─────────────┐           ┌─────────────┼─────────────┐
                          │   Eureka    │           ▼             ▼             ▼
                          │   :8761     │    ┌──────────┐  ┌──────────┐  ┌──────────┐
                          └─────────────┘    │ Postgres │  │  Kafka   │  │  Redis   │
                                             │  :5432   │  │  :29092  │  │  :6379   │
                                             └──────────┘  └──────────┘  └──────────┘
```

**Request path:** Browser → Nginx (production) or Vite dev server → Spring Cloud Gateway → Eureka `lb://` route → target service.

**Auth:** JWT issued by `client-service`; every protected service validates the same `JWT_SECRET`. Phone number is the primary login identifier (E.164, Google libphonenumber).

**Payments:** Stripe Checkout is created by `shop-service`; webhooks land on `invoice-service` at `/api/payments/webhooks/stripe` (signature-verified, idempotent).

**Events (Kafka):**

| Topic | Publisher | Consumer(s) |
|---|---|---|
| `work-order-events` | work-order | notification |
| `workorder.completed.v1` | work-order | maintenance |
| `shop.order.status` | shop | notification |
| `delivery.status.v1` | delivery | notification |
| `maintenance.service-due.v1` | maintenance | notification |
| `listing-review-events` | marketplace | notification |

**Database:** One PostgreSQL database (`rigoomarine`); each module owns Flyway migrations in its own schema history table (`flyway_schema_history_<module>`).

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Backend** | Java 17, Spring Boot 3.2, Spring Cloud Gateway, Netflix Eureka, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL 15, Redis 7, Kafka 7.7 (Confluent), Stripe Java SDK, Maven multi-module |
| **Frontend** | React 18, Vite 6, Material UI 7, TanStack Query, React Router 7, Axios, react-i18next, Leaflet, Recharts, Vitest |
| **Infra** | Docker Compose, GitHub Actions, Nginx + Certbot, Oracle Cloud (ARM64), Vercel (frontend CDN option) |
| **Shared libs** | `common-security`, `common-exceptions` |

`config-server/` is scaffolded but not deployed — each service reads its own `application.yml` plus environment variables.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker + Compose | v2+ | Full-stack local run |
| Java JDK | 17 | Backend build / `spring-boot:run` |
| Maven | 3.9+ | Backend build |
| Node.js | 20 | Frontend dev / build |
| Git | — | Clone and CI |

**Recommended RAM:** 16 GB for the full Docker Compose stack (18 containers). For lighter local work, run only infrastructure in Docker and start individual services with Maven.

---

## Quick start (Docker — full stack)

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` for local development. Minimum overrides:

```bash
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=$(openssl rand -hex 64)
INTERNAL_API_TOKEN=$(openssl rand -hex 32)
ALLOWED_ORIGINS=http://localhost:3080,http://localhost:5173,http://localhost:3000
PUBLIC_API_URL=http://localhost:8080
FRONTEND_BASE_URL=http://localhost:3080
```

Leave `STRIPE_*` empty to disable payments (shop checkout returns a graceful “payments not configured” response).

### 2. Build and start

```bash
docker compose up -d --build
```

First build compiles all backend modules and the frontend image — expect several minutes.

### 3. Verify

| Service | URL |
|---|---|
| Frontend | http://localhost:3080 |
| API Gateway | http://localhost:8080/actuator/health |
| Eureka dashboard | http://localhost:8761 *(internal in production; expose locally if needed)* |

```bash
docker compose ps          # all services should be healthy
docker compose logs -f api-gateway   # tail gateway logs
```

### 4. Stop

```bash
docker compose down        # keep volumes
docker compose down -v     # wipe DB and uploaded files
```

---

## Local development (hybrid)

The default `docker-compose.yml` does not expose Postgres, Kafka, or Eureka on the host (by design). The simplest hybrid workflow is:

**Backend in Docker, frontend on the host** — fast UI iteration without rebuilding Java images.

```bash
# Terminal 1 — build and start everything, then stop the static frontend container
docker compose up -d --build
docker compose stop frontend

# Terminal 2 — Vite dev server with hot reload
cd rigoo-marine-frontend
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:8080
npm ci && npm run dev         # http://localhost:5173
```

Add `http://localhost:5173` to `ALLOWED_ORIGINS` in `.env` and restart the gateway if CORS errors appear.

**Full local backend (IDE / `mvn spring-boot:run`)** — temporarily expose infra ports in `docker-compose.yml`:

```yaml
# Under postgres, kafka, and discovery-service — add for local dev only:
ports:
  - "5432:5432"    # postgres
  - "9092:29092"   # kafka (host 9092 → container 29092)
  - "8761:8761"    # discovery-service
```

Then start infra and run individual modules:

```bash
docker compose up -d postgres redis zookeeper kafka discovery-service
cd rigoo-marine-backend && mvn clean install -DskipTests

# Example — start gateway last, after client-service is up
cd client-module  && mvn spring-boot:run   # :8081
cd gateway-module && mvn spring-boot:run   # :8080
```

Export shared env vars (or source from `.env`):

```bash
export EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka/
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/rigoomarine
export SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export JWT_SECRET=<same value in every service>
```

### Tests

```bash
# Backend (all modules)
cd rigoo-marine-backend && mvn verify

# Frontend
cd rigoo-marine-frontend && npm test
```

---

## Services

| Service | Eureka name | Port | Purpose |
|---|---|---|---|
| `discovery-service` | — | 8761 | Netflix Eureka service registry |
| `api-gateway` | `api-gateway` | 8080 | Routing, CORS, Redis-backed rate limiting |
| `client-service` | `client-service` | 8081 | Auth (JWT), users, admin APIs, uploads, email verification, password reset |
| `vessel-service` | `vessel-service` | 8082 | Vessel registry |
| `service-service` | `service-service` | 8083 | Service catalog |
| `work-order-service` | `work-order-service` | 8084 | Service requests, approvals, status workflow, inventory |
| `invoice-service` | `invoice-service` | 8085 | Invoices, quotations, Stripe webhooks, PDF export |
| `technician-service` | `technician-service` | 8086 | Technician and team-lead dashboard APIs |
| `notification-service` | `notification-service` | 8087 | Email templates (EN+AR), Kafka consumers, optional WhatsApp |
| `marketplace-service` | `marketplace-service` | 8088 | Used-boat listings and inquiries |
| `shop-service` | `shop-service` | 8089 | Parts/tools catalog, cart, Stripe Checkout, orders |
| `delivery-service` | `delivery-service` | 8092 | Delivery tasks, driver GPS, proof-of-delivery |
| `maintenance-service` | `maintenance-service` | 8091 | Service history, schedules, vessel inspections |
| `frontend` | — | 3080→80 | React SPA served by Nginx inside the container |

Gateway routes are defined in `rigoo-marine-backend/gateway-module/src/main/resources/application.yml` (e.g. `/auth/**`, `/api/work-orders/**`, `/api/products/**`, `/api/delivery/**`).

---

## User roles

| Role | Frontend base path | Description |
|---|---|---|
| `CLIENT` | `/dashboard` | Boat owners and customers |
| `TECHNICIAN` | `/technician` | Field technicians executing work orders |
| `TEAM_LEAD` | `/team-lead` | Supervisors — approvals, billing, team oversight |
| `DELIVERY` | `/delivery` | Delivery drivers |
| `ADMIN` | `/admin` | Full platform administration |

A seed admin account is created by Flyway migration `V23__seed_admin_account.sql` on first startup. **Change the password immediately** after first login in any shared or production environment.

---

## Environment variables

Copy `.env.example` → `.env`. Never commit `.env`.

| Variable | Used by | Notes |
|---|---|---|
| `DOCKERHUB_USERNAME` / `DOCKER_TAG` | Compose | Image registry and deploy tag |
| `DB_USERNAME` / `DB_PASSWORD` | All data services | Production: use least-privilege user — see [SECURITY_DATABASE.md](./rigoo-marine-backend/SECURITY_DATABASE.md) |
| `REDIS_PASSWORD` | Gateway, all services | Rate limiting and caching |
| `JWT_SECRET` | All secured services | **Must be identical everywhere.** Generate: `openssl rand -hex 64` |
| `INTERNAL_API_TOKEN` | invoice, shop, vessel, work-order, maintenance | Service-to-service auth |
| `ALLOWED_ORIGINS` | Gateway | Comma-separated CORS origins |
| `PUBLIC_API_URL` | client | Public base URL for `/uploads/*` links |
| `FRONTEND_BASE_URL` | client, shop | Email links and Stripe redirect URLs |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | invoice, shop | Empty = payments disabled |
| `MAIL_ENABLED` | client, notification | `false` → emails logged, not sent |
| `SPRING_MAIL_*` / `MAIL_FROM` | client, notification | Required when `MAIL_ENABLED=true` |
| `WHATSAPP_ENABLED` + provider vars | notification | Optional Twilio or Meta WhatsApp |

Frontend variables live in `rigoo-marine-frontend/.env` — see `rigoo-marine-frontend/.env.example` (`VITE_API_BASE_URL` is the critical one).

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `backend-ci.yml` | Push/PR to `main`, `develop`, `production` | `mvn verify`, build changed service Docker images, push to Docker Hub |
| `frontend-ci.yml` | Push/PR (frontend paths) | ESLint, Vitest, Vercel preview deploy |
| `deploy-prod.yml` | Release published or manual | Self-hosted runner pulls images and runs `docker compose up` on production server |
| `codeql.yml` | Scheduled / push | Security analysis |

Production deploy expects:

- Self-hosted GitHub runner tagged `production` on the Oracle Cloud VM
- `/opt/rigoo-marine-prod/.env` with production secrets
- Nginx terminating TLS — see [deploy/setup-server.sh](./deploy/setup-server.sh)

---

## Production deployment

High-level steps (run once per server):

1. **Provision server** — Ubuntu 22.04/24.04 (x86 or ARM64). Open ports 22, 80, 443 in cloud firewall + `ufw`.
2. **Run setup script** — `deploy/setup-server.sh` installs Docker, Nginx, Certbot, and creates the deploy user.
3. **Configure DNS** — A records for `@`, `www`, and `api` → server IP. See [deploy/dns-records.md](./deploy/dns-records.md).
4. **TLS** — Certbot HTTP-01 against Nginx; full config in `deploy/nginx.conf`.
5. **Secrets** — Copy production `.env` to `/opt/rigoo-marine-prod/.env`.
6. **Deploy** — Publish a GitHub Release or dispatch `Deploy to Production` workflow.

Frontend can alternatively deploy to **Vercel** (`rigoo-marine-frontend/vercel.json`) while the API stays on Oracle Cloud — set `VITE_API_BASE_URL=https://api.rigoomarine.com` and add the Vercel URL to `ALLOWED_ORIGINS`.

---

## Project layout

```
Rigoomarine/
├── rigoo-marine-backend/          Maven parent (rigoo-marine-parent)
│   ├── discovery-service/         Eureka server
│   ├── gateway-module/            Spring Cloud Gateway
│   ├── client-module/             Auth, users, admin, uploads
│   ├── vessel-module/
│   ├── service-module/
│   ├── work-order-module/
│   ├── technician-module/
│   ├── invoice-module/
│   ├── notification-module/
│   ├── marketplace-module/
│   ├── shop-module/
│   ├── delivery-module/
│   ├── maintenance-module/
│   ├── common-security/           Shared JWT filter + config
│   ├── common-exceptions/         Shared error response types
│   ├── config-server/             Scaffolded, not deployed
│   └── SECURITY_DATABASE.md       Production DB hardening guide
│
├── rigoo-marine-frontend/         React SPA
│   └── src/
│       ├── pages/                 public, auth, dashboard, admin, technician, delivery, …
│       ├── components/            layout, shop, marketplace, common
│       ├── services/api.js        Axios clients per domain
│       └── i18n/locales/{en,ar}/  Namespace JSON files
│
├── deploy/                        nginx.conf, setup-server.sh, DNS notes
├── docker-compose.yml             Full production-shaped stack (18 containers)
├── .env.example                   Root environment template
└── .github/workflows/             CI/CD pipelines
```

---

## Security notes

- PostgreSQL and Redis have **no external ports** in the default Compose file.
- Gateway applies **Redis rate limits** on auth, checkout, and inquiry endpoints.
- Stripe webhooks require valid `STRIPE_WEBHOOK_SECRET` signature verification.
- Rotate `JWT_SECRET`, `INTERNAL_API_TOKEN`, and DB credentials before any public deploy.
- Do not commit `.env`, SSH keys, or invoice PDFs (see `.gitignore`).

---

## Further reading

| Document | Contents |
|---|---|
| [rigoo-marine-backend/SECURITY_DATABASE.md](./rigoo-marine-backend/SECURITY_DATABASE.md) | TLS, least-privilege DB user, HikariCP tuning |
| [deploy/dns-records.md](./deploy/dns-records.md) | Cloudflare DNS and TLS checklist |
| [deploy/setup-server.sh](./deploy/setup-server.sh) | One-shot production server bootstrap |

---

## License

MIT
