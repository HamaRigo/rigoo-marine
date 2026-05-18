# Run Locally — Minimum Docker (Recommended)

Run only the 4 infrastructure containers in Docker; everything else runs directly
in IntelliJ or the Node dev server. No JVM images needed, so disk usage stays low.

---

## Prerequisites

- Java 17+
- Node.js 20+
- Docker Desktop (running)
- IntelliJ IDEA (Community or Ultimate)
- Maven (or use the IntelliJ built-in)

---

## Step 1 — Start Infrastructure (Docker only)

```bash
docker compose up -d postgres redis zookeeper kafka
```

This pulls/starts only 4 small images (~300 MB total). Wait ~15 s for Postgres to
be ready before starting services.

Verify:

```bash
docker compose ps
```

All 4 should show `healthy` or `running`.

---

## Step 2 — Run Backend Services from IntelliJ

Open `rigoo-marine-backend/` as a Maven project in IntelliJ.

Start services **in order** — each one is a Spring Boot run configuration pointing
to its main class:

| # | Module | Main Class | Port |
|---|--------|-----------|------|
| 1 | `discovery-service` | `DiscoveryApplication` | 8761 |
| 2 | `gateway-module` | `GatewayApplication` | 8080 |
| 3 | `client-module` | `ClientApplication` | 8081 |
| 4 | `vessel-module` | `VesselApplication` | 8082 |
| 5 | `service-module` | `ServiceApplication` | 8083 |
| 6 | `work-order-module` | `WorkOrderApplication` | 8084 |
| 7 | `technician-module` | `TechnicianApplication` | 8086 |
| 8 | `maintenance-module` | `MaintenanceApplication` | 8091 |
| 9 | `shop-module` | `ShopApplication` | 8089 |

**Wait ~20 s between discovery-service and the gateway** so the gateway finds Eureka
before it starts routing.

### No env vars needed

All services default to `localhost` for every dependency:

| Setting | Default |
|---------|---------|
| PostgreSQL | `localhost:5432 / rigoomarine / postgres / postgres` |
| Redis | `localhost:6379` |
| Eureka | `http://localhost:8761/eureka/` |
| JWT secret | built-in dev key |
| Mail | disabled (`MAIL_ENABLED=false`) |

### Optional services (start only if you need them)

| Module | Main Class | Port | When needed |
|--------|-----------|------|-------------|
| `invoice-module` | `InvoiceApplication` | 8085 | billing / PDF flows |
| `notification-module` | `NotificationApplication` | 8087 | email / WhatsApp alerts |
| `marketplace-module` | `MarketplaceApplication` | 8088 | parts marketplace |

---

## Step 3 — Start Frontend Dev Server

```bash
cd rigoo-marine-frontend
npm install        # first time only
npm run dev
```

Frontend runs on **http://localhost:5173** and proxies API calls to the gateway on
`http://localhost:8080`.

---

## Access Points

| URL | What |
|-----|------|
| http://localhost:5173 | Frontend (Vite dev server) |
| http://localhost:8080 | API Gateway |
| http://localhost:8761 | Eureka dashboard |

---

## Quick Health Check

```bash
# Infra
docker compose ps

# Gateway
curl http://localhost:8080/actuator/health

# Eureka (lists registered services)
curl http://localhost:8761/eureka/apps | grep -o '<app>.*</app>'
```

---

## Stopping

```bash
# Stop infrastructure
docker compose down

# Stop IntelliJ services: use the Stop button in the Run panel
```

---

## Troubleshooting

**Service won't register with Eureka**
Make sure discovery-service started first and is healthy (`curl http://localhost:8761/actuator/health`).

**`Could not find artifact com.rigoomarine:common-security`**
Run a Maven install from the project root before running individual modules:
```bash
cd rigoo-marine-backend
mvn install -DskipTests
```

**Kafka errors in logs**
Non-fatal for core flows. Notifications and async events won't fire, but auth /
vessel / work-order functionality works normally.

**Port already in use**
Check for stale processes: `lsof -i :<port>` then `kill <PID>`.

**Postgres connection refused**
Confirm the container is up: `docker compose ps postgres`. If it shows `starting`,
wait a few more seconds.
