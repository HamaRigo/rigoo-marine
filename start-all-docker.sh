#!/usr/bin/env bash
# Rigoo Marine - Full Docker Start Script
# Builds and starts the full stack via docker-compose.yml.

set -euo pipefail

cd "$(dirname "$0")"

echo "========================================="
echo "  Rigoo Marine - Full Docker Deploy"
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
echo "Step 1: Building backend JARs..."
( cd rigoo-marine-backend && mvn -q -DskipTests \
    -pl discovery-service,gateway-module,client-module,vessel-module,service-module,work-order-module,technician-module,invoice-module,notification-module,marketplace-module,shop-module \
    -am package )

echo ""
echo "Step 2: Building frontend bundle..."
( cd rigoo-marine-frontend && npm install --silent && npm run build --silent )

echo ""
echo "Step 3: Building Docker images..."
docker compose build

echo ""
echo "Step 4: Starting the stack..."
docker compose up -d

echo ""
echo "Waiting for backend services to become healthy (this can take ~3-4 min on a cold start)..."
deadline=$(( $(date +%s) + 600 ))
while :; do
    healthy=$(docker compose ps --format '{{.Status}}' | grep -c '(healthy)' || true)
    starting=$(docker compose ps --format '{{.Status}}' | grep -c 'health: starting' || true)
    exited=$(docker compose ps -a --format '{{.State}}' | grep -c exited || true)
    echo "  healthy=$healthy  starting=$starting  exited=$exited"
    if [ "$healthy" -ge 13 ] && [ "$starting" -eq 0 ]; then break; fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
        echo "WARN: timeout waiting for healthchecks; continuing." >&2
        break
    fi
    sleep 15
done

echo ""
echo "========================================="
docker compose ps -a --format "table {{.Name}}\t{{.Status}}"
echo "========================================="
echo ""
echo "Service URLs:"
echo "  Frontend:       http://localhost"
echo "  API Gateway:    http://localhost:8080"
echo "  Eureka:         http://localhost:8761"
echo ""
echo "Logs:    docker compose logs -f [service]"
echo "Stop:    docker compose down"
echo "========================================="
