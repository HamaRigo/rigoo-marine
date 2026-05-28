#!/usr/bin/env bash
# Rigoo Marine - Development Start Script
# Starts only the infrastructure (PostgreSQL, Redis, Kafka, Zookeeper, Kafka UI).
# Run the Spring services and the Vite dev server on the host.

set -euo pipefail

cd "$(dirname "$0")"

echo "========================================="
echo "  Rigoo Marine - Dev Infrastructure"
echo "========================================="

if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed or not in PATH" >&2
    exit 1
fi
if ! docker info &>/dev/null; then
    echo "ERROR: Docker daemon is not running" >&2
    exit 1
fi

if [ -f .env ]; then
    set -a; . ./.env; set +a
    echo "Loaded environment variables from .env"
fi

echo ""
echo "Starting infrastructure (PostgreSQL, Redis, Kafka, Zookeeper, Kafka UI)..."
docker compose -f docker-compose.dev.yml up -d

echo ""
echo "Waiting for PostgreSQL..."
until docker exec marine-postgres pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
echo "Waiting for Redis..."
until docker exec marine-redis redis-cli ping >/dev/null 2>&1; do sleep 1; done
echo "Waiting for Kafka..."
until docker exec marine-kafka kafka-topics --bootstrap-server kafka:29092 --list >/dev/null 2>&1; do sleep 2; done

echo ""
echo "========================================="
echo "  Infrastructure Ready"
echo "========================================="
echo ""
echo "PostgreSQL: localhost:5432"
echo "Redis:      localhost:6379"
echo "Kafka:      localhost:9092"
echo "Kafka UI:   http://localhost:8090"
echo ""
echo "Start each Spring service in its own terminal — ORDER MATTERS:"
echo ""
echo "  STEP 1 — Eureka (must be up before any other service)"
echo "  cd rigoo-marine-backend/discovery-service && mvn spring-boot:run"
echo "  Wait until you see: 'Started EurekaServerApplication' (port 8761)"
echo ""
echo "  STEP 2 — Gateway + all backend services (any order after step 1)"
for m in gateway-module client-module vessel-module service-module \
         work-order-module technician-module invoice-module notification-module \
         marketplace-module shop-module delivery-module; do
    echo "  cd rigoo-marine-backend/$m && mvn spring-boot:run"
done
echo ""
echo "  STEP 3 — Frontend"
echo "  cd rigoo-marine-frontend && npm run dev   # http://localhost:3000"
echo ""
echo "Service ports:"
echo "  Eureka dashboard : http://localhost:8761"
echo "  API Gateway      : http://localhost:8080"
echo "  Frontend         : http://localhost:3000"
echo "  Kafka UI         : http://localhost:8090"
echo "========================================="
