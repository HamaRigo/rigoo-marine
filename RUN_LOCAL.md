# Run Application Locally - Quick Start

## Prerequisites

Install these first:
- Java 17+
- Node.js 20+
- Docker & Docker Composec
- PostgreSQL (or use Docker)
- Kafka (or use Docker)

---

## Option A: Run Everything with Docker (Recommended)

### Step 1: Build all backend services

```bash
cd rigoo-marine-backend
mvn clean install -DskipTests
```

### Step 2: Build Docker images

```bash
# Build all backend images
docker build -t rigoomarine/api-gateway:latest -f gateway-module/Dockerfile .
docker build -t rigoomarine/client-service:latest -f client-module/Dockerfile .
docker build -t rigoomarine/vessel-service:latest -f vessel-module/Dockerfile .
docker build -t rigoomarine/service-service:latest -f service-module/Dockerfile .
docker build -t rigoomarine/work-order-service:latest -f work-order-module/Dockerfile .
docker build -t rigoomarine/technician-service:latest -f technician-module/Dockerfile .
docker build -t rigoomarine/invoice-service:latest -f invoice-module/Dockerfile .
docker build -t rigoomarine/notification-service:latest -f notification-module/Dockerfile .
docker build -t rigoomarine/discovery-service:latest -f discovery-service/Dockerfile .
```

### Step 3: Build frontend image

```bash
cd rigoo-marine-frontend
npm install
npm run build
docker build -t rigoomarine/marine-frontend:latest .
```

### Step 4: Start all services

```bash
cd /Users/hammarigo/Desktop/Rigoomarine
docker compose up -d
```

### Step 5: Check status

```bash
docker compose ps
docker compose logs -f
```

### Access the app:
- Frontend: http://localhost
- API Gateway: http://localhost:8080
- Eureka Dashboard: http://localhost:8761

---

## Option B: Run Services Individually (Development)

### Step 1: Start Infrastructure (PostgreSQL + Kafka + Zookeeper)

```bash
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rigoomarine \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name zookeeper \
  -p 2181:2181 \
  confluentinc/cp-zookeeper:7.4.0

docker run -d --name kafka \
  -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  --link zookeeper \
  confluentinc/cp-kafka:7.4.0
```

### Step 2: Start Discovery Service

```bash
cd rigoo-marine-backend/discovery-service
mvn spring-boot:run
```

### Step 3: Start API Gateway

```bash
cd rigoo-marine-backend/gateway-module
mvn spring-boot:run
```

### Step 4: Start all microservices (each in separate terminal)

```bash
# Client Service
cd rigoo-marine-backend/client-module
mvn spring-boot:run

# Vessel Service
cd rigoo-marine-backend/vessel-module
mvn spring-boot:run

# Service Service
cd rigoo-marine-backend/service-module
mvn spring-boot:run

# Work Order Service
cd rigoo-marine-backend/work-order-module
mvn spring-boot:run

# Technician Service
cd rigoo-marine-backend/technician-module
mvn spring-boot:run

# Invoice Service
cd rigoo-marine-backend/invoice-module
mvn spring-boot:run

# Notification Service
cd rigoo-marine-backend/notification-module
mvn spring-boot:run
```

### Step 5: Start Frontend

```bash
cd rigoo-marine-frontend
npm install
npm run dev
```

Access:
- Frontend: http://localhost:5173
- API Gateway: http://localhost:8080

---

## Troubleshooting

### Services won't connect to Eureka
- Make sure Discovery Service is running first
- Wait 30 seconds for services to register

### Kafka connection errors
- The app will still work - Kafka errors are caught and logged
- Notifications won't be sent, but core functionality works

### Database errors
- Check PostgreSQL is running: `docker ps | grep postgres`
- Check connection: `psql -h localhost -U postgres -d rigoomarine`

### Frontend can't connect to API
- Check VITE_API_BASE_URL in .env
- Make sure API Gateway is running on port 8080

---

## Quick Health Check

```bash
# Test API Gateway
curl http://localhost:8080/actuator/health

# Test Eureka
curl http://localhost:8761/actuator/health

# Test services registration
curl http://localhost:8761/eureka/apps
```
