#!/bin/bash

# Rigoo Marine - Development Start Script
# Starts infrastructure and all services for local development

set -e

echo "========================================="
echo "  Rigoo Marine - Development Start"
echo "========================================="

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker daemon is not running"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "Loaded environment variables from .env"
fi

# Start infrastructure (PostgreSQL, Kafka, Zookeeper)
echo ""
echo "Starting infrastructure (PostgreSQL, Kafka, Zookeeper)..."
docker compose -f docker-compose.dev.yml up -d

echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo "Waiting for Kafka to be ready..."
sleep 10

echo ""
echo "========================================="
echo "  Infrastructure Started!"
echo "========================================="
echo ""
echo "PostgreSQL: localhost:5432"
echo "Kafka:      localhost:9092"
echo "Kafka UI:   http://localhost:8090"
echo ""
echo "Now start the services manually:"
echo ""
echo "  # Terminal 1 - Discovery Service"
echo "  cd rigoo-marine-backend/discovery-service && mvn spring-boot:run"
echo ""
echo "  # Terminal 2 - API Gateway"
echo "  cd rigoo-marine-backend/gateway-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 3 - Client Service"
echo "  cd rigoo-marine-backend/client-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 4 - Vessel Service"
echo "  cd rigoo-marine-backend/vessel-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 5 - Service Service"
echo "  cd rigoo-marine-backend/service-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 6 - Work Order Service"
echo "  cd rigoo-marine-backend/work-order-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 7 - Technician Service"
echo "  cd rigoo-marine-backend/technician-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 8 - Invoice Service"
echo "  cd rigoo-marine-backend/invoice-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 9 - Notification Service"
echo "  cd rigoo-marine-backend/notification-module && mvn spring-boot:run"
echo ""
echo "  # Terminal 10 - Frontend"
echo "  cd rigoo-marine-frontend && npm run dev"
echo ""
echo "========================================="
