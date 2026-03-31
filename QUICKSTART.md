# Quick Start - Get Running in 5 Minutes

## Prerequisites

Make sure you have installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Java 17+](https://adoptium.net/)
- [Node.js 20+](https://nodejs.org/)
- [Maven](https://maven.apache.org/download.cgi)

---

## Option 1: Run Everything with Docker (Easiest)

```bash
# 1. Go to project root
cd /Users/hammarigo/Desktop/Rigoomarine

# 2. Run the start script
./start-all-docker.sh
```

That's it! Wait 2-3 minutes for builds, then access:
- **Frontend:** http://localhost
- **Eureka Dashboard:** http://localhost:8761
- **API Gateway:** http://localhost:8080

---

## Option 2: Run Infrastructure Only (For Development)

```bash
# 1. Start PostgreSQL + Kafka
./start-dev.sh

# 2. In separate terminals, run each service:
cd rigoo-marine-backend/discovery-service && mvn spring-boot:run
cd rigoo-marine-backend/gateway-module && mvn spring-boot:run
cd rigoo-marine-backend/client-module && mvn spring-boot:run
# ... etc for other services

# 3. Run frontend in another terminal:
cd rigoo-marine-frontend && npm install && npm run dev
```

---

## Verify Everything is Running

```bash
# Check Docker containers
docker compose ps

# Test API Gateway
curl http://localhost:8080/actuator/health

# Test Eureka
curl http://localhost:8761/actuator/health

# Get list of services
curl http://localhost:8080/api/services
```

---

## Stop Everything

```bash
docker compose down
```

---

## Troubleshooting

### "Port already in use"
```bash
# Find what's using the port
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### "Connection refused"
Wait 30-60 seconds for services to start. Check logs:
```bash
docker compose logs -f
```

### Frontend won't load
Make sure API Gateway is running. Frontend needs it for API calls.

### Database errors
Restart PostgreSQL:
```bash
docker compose restart postgres
```

---

## Default Test Data

The database includes 10 pre-loaded services:
- Engine Diagnostics
- Oil Change
- Propeller Repair
- Hull Cleaning
- Electrical System Check
- Winterization
- De-winterization
- Bottom Paint
- Transmission Service
- Generator Service

---

## Next Steps

1. Open http://localhost in your browser
2. Click "Services" to see available services
3. Click "Request Service" to create a work order
4. (Optional) Create an account to track orders

For CI/CD setup, see [CICD_SETUP_TASKS.md](./CICD_SETUP_TASKS.md)
