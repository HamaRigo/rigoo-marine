#!/bin/bash

# Rigoo Marine - Full Docker Start Script
# Builds and starts all services with Docker Compose

set -e

echo "========================================="
echo "  Rigoo Marine - Full Docker Deploy"
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

# Build backend
echo ""
echo "Step 1: Building backend services..."
cd rigoo-marine-backend
mvn clean install -DskipTests
cd ..

# Build Docker images
echo ""
echo "Step 2: Building Docker images..."

echo "  Building discovery-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/discovery-service:latest \
  -f rigoo-marine-backend/discovery-service/Dockerfile .

echo "  Building api-gateway..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/api-gateway:latest \
  -f rigoo-marine-backend/gateway-module/Dockerfile .

echo "  Building client-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/client-service:latest \
  -f rigoo-marine-backend/client-module/Dockerfile .

echo "  Building vessel-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/vessel-service:latest \
  -f rigoo-marine-backend/vessel-module/Dockerfile .

echo "  Building service-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/service-service:latest \
  -f rigoo-marine-backend/service-module/Dockerfile .

echo "  Building work-order-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/work-order-service:latest \
  -f rigoo-marine-backend/work-order-module/Dockerfile .

echo "  Building technician-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/technician-service:latest \
  -f rigoo-marine-backend/technician-module/Dockerfile .

echo "  Building invoice-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/invoice-service:latest \
  -f rigoo-marine-backend/invoice-module/Dockerfile .

echo "  Building notification-service..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/notification-service:latest \
  -f rigoo-marine-backend/notification-module/Dockerfile .

echo "  Building frontend..."
docker build -t ${DOCKERHUB_USERNAME:-rigoomarine}/marine-frontend:latest \
  -f rigoo-marine-frontend/Dockerfile .

# Start all services
echo ""
echo "Step 3: Starting all services with Docker Compose..."
docker compose up -d

echo ""
echo "========================================="
echo "  All Services Started!"
echo "========================================="
echo ""
echo "Waiting for services to initialize..."
sleep 15

echo ""
echo "Service URLs:"
echo "  Frontend:       http://localhost"
echo "  API Gateway:    http://localhost:8080"
echo "  Eureka:         http://localhost:8761"
echo "  Kafka UI:       http://localhost:8090"
echo ""
echo "Check logs:"
echo "  docker compose logs -f"
echo ""
echo "Stop services:"
echo "  docker compose down"
echo "========================================="
