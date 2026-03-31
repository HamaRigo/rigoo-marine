# Rigoo Marine Services Platform

A microservices-based platform for marine/boat services management.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Frontend  │────▶│ API Gateway  │────▶│  Microservices      │
│   (React)   │     │  (Port 8080) │     │  (8 services)       │
└─────────────┘     └──────────────┘     └─────────────────────┘
                           │                      │
                           ▼                      ▼
                    ┌─────────────┐      ┌──────────────┐
                    │   Eureka    │      │  PostgreSQL  │
                    │  (8761)     │      │   (5432)     │
                    └─────────────┘      └──────────────┘
                                                │
                                          ┌──────────────┐
                                          │    Kafka     │
                                          │   (9092)     │
                                          └──────────────┘
```

## Microservices

| Service | Port | Description |
|---------|------|-------------|
| Discovery Service | 8761 | Eureka service registry |
| API Gateway | 8080 | Central API gateway |
| Client Service | 8081 | Client/customer management |
| Vessel Service | 8082 | Vessel/boat management |
| Service Service | 8083 | Service catalog |
| Work Order Service | 8084 | Work order management |
| Technician Service | 8085 | Technician management |
| Invoice Service | 8086 | Invoice and payments |
| Notification Service | 8087 | Email/push notifications |

## Quick Start

### Option 1: Full Stack with Docker (Recommended)

```bash
# 1. Build all backend services
cd rigoo-marine-backend
mvn clean install -DskipTests

# 2. Build frontend
cd ../rigoo-marine-frontend
npm install
npm run build

# 3. Build Docker images (from project root)
cd ..
docker build -t rigoomarine/api-gateway:latest -f rigoo-marine-backend/gateway-module/Dockerfile .
docker build -t rigoomarine/client-service:latest -f rigoo-marine-backend/client-module/Dockerfile .
docker build -t rigoomarine/vessel-service:latest -f rigoo-marine-backend/vessel-module/Dockerfile .
docker build -t rigoomarine/service-service:latest -f rigoo-marine-backend/service-module/Dockerfile .
docker build -t rigoomarine/work-order-service:latest -f rigoo-marine-backend/work-order-module/Dockerfile .
docker build -t rigoomarine/technician-service:latest -f rigoo-marine-backend/technician-module/Dockerfile .
docker build -t rigoomarine/invoice-service:latest -f rigoo-marine-backend/invoice-module/Dockerfile .
docker build -t rigoomarine/notification-service:latest -f rigoo-marine-backend/notification-module/Dockerfile .
docker build -t rigoomarine/discovery-service:latest -f rigoo-marine-backend/discovery-service/Dockerfile .
docker build -t rigoomarine/marine-frontend:latest -f rigoo-marine-frontend/Dockerfile .

# 4. Start everything
docker compose up -d

# 5. Check status
docker compose ps
```

Access:
- **Frontend:** http://localhost
- **API Gateway:** http://localhost:8080
- **Eureka Dashboard:** http://localhost:8761

### Option 2: Development Mode (Infrastructure only)

Run only infrastructure (PostgreSQL, Kafka) locally and run Java services on your machine:

```bash
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Run individual services (in separate terminals)
cd rigoo-marine-backend/discovery-service && mvn spring-boot:run
cd rigoo-marine-backend/gateway-module && mvn spring-boot:run
cd rigoo-marine-backend/client-module && mvn spring-boot:run
# ... etc for each service

# Run frontend
cd rigoo-marine-frontend
npm run dev
```

Access:
- **Frontend:** http://localhost:5173
- **Kafka UI:** http://localhost:8090

## Environment Variables

Create a `.env` file in the project root:

```bash
# Docker Hub
DOCKERHUB_USERNAME=your-username

# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=rigoomarine
DB_HOST=localhost
DB_PORT=5432

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Eureka
EUREKA_SERVER=http://localhost:8761/eureka/
```

## Tech Stack

### Backend
- Java 17 + Spring Boot 3.2
- Spring Cloud (Eureka, Gateway)
- PostgreSQL
- Kafka
- Maven

### Frontend
- React 18 + Vite
- Material-UI (MUI)
- React Query
- React Router
- Axios

## API Endpoints

After starting the services:

```bash
# Health check
curl http://localhost:8080/actuator/health

# Eureka status
curl http://localhost:8761/actuator/health

# Get services
curl http://localhost:8080/api/services

# Create work order
curl -X POST http://localhost:8080/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "vesselId": 1,
    "description": "Engine making strange noise",
    "priority": "HIGH",
    "serviceIds": [1, 2]
  }'
```

## Documentation

- [CI/CD Setup Guide](./CICD_SETUP_TASKS.md) - Step-by-step CI/CD configuration
- [Run Local Guide](./RUN_LOCAL.md) - Detailed local setup instructions

## Project Structure

```
rigoo-marine-backend/     # Backend monorepo
├── gateway-module/       # API Gateway
├── discovery-service/    # Eureka server
├── client-module/        # Client service
├── vessel-module/        # Vessel service
├── service-module/       # Service catalog
├── work-order-module/    # Work order service
├── technician-module/    # Technician service
├── invoice-module/       # Invoice service
└── notification-module/  # Notification service

rigoo-marine-frontend/    # React frontend
├── src/
│   ├── pages/
│   ├── components/
│   ├── services/
│   └── context/
└── public/

.github/workflows/        # CI/CD pipelines
docker-compose.yml        # Production compose
docker-compose.dev.yml    # Development compose
```

## License

MIT
