# CI/CD Pipeline Setup Guide

## Overview

This project uses GitHub Actions for CI/CD with Docker Hub for container images.

## Workflows

| Workflow | File | Description |
|----------|------|-------------|
| Backend CI/CD | `backend-ci.yml` | Builds, tests, and pushes Docker images for all Java microservices |
| Frontend CI/CD | `frontend-ci.yml` | Lints, builds, and pushes Docker image for React frontend |
| Deploy to Dev | `deploy-dev.yml` | Auto-deploys to development server on successful build |
| Deploy to Prod | `deploy-prod.yml` | Deploys to production on GitHub release |

## Required Secrets

Configure these secrets in GitHub (Settings → Secrets and variables → Actions):

### Docker Hub
```
DOCKERHUB_USERNAME       - Your Docker Hub username
DOCKERHUB_TOKEN          - Your Docker Hub access token
```

### Development Server
```
DEV_SSH_PRIVATE_KEY      - SSH private key for dev server
DEV_SSH_USER             - SSH username for dev server
DEV_SERVER_HOST          - Dev server hostname/IP
```

### Production Server
```
PROD_SSH_PRIVATE_KEY     - SSH private key for prod server
PROD_SSH_USER            - SSH username for prod server
PROD_SERVER_HOST         - Prod server hostname/IP
PROD_DOMAIN              - Production domain (for health checks)
```

## Pipeline Flow

```
Push to develop
    → Build & Test
    → Push Docker images (latest)
    → Deploy to dev server

Push to main
    → Build & Test
    → Push Docker images (commit SHA tagged)

Create Release
    → Deploy to production (version tagged)
```

## Local Development

### Build all services
```bash
cd rigoo-marine-backend
mvn clean install
```

### Build frontend
```bash
cd rigoo-marine-frontend
npm install
npm run build
```

### Run with Docker Compose
```bash
# Set environment variables
export DOCKERHUB_USERNAME=your-username
export DB_USERNAME=postgres
export DB_PASSWORD=postgres

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Service Ports

| Service | Port |
|---------|------|
| Frontend | 80 |
| API Gateway | 8080 |
| Discovery Service | 8761 |
| Client Service | 8081 |
| Vessel Service | 8082 |
| Service Service | 8083 |
| Work Order Service | 8084 |
| Technician Service | 8085 |
| Invoice Service | 8086 |
| Notification Service | 8087 |
| PostgreSQL | 5432 |

## Manual Docker Image Build

```bash
# Backend services
docker build -t your-username/api-gateway:latest \
  -f rigoo-marine-backend/gateway-module/Dockerfile .

# Frontend
docker build -t your-username/marine-frontend:latest \
  -f rigoo-marine-frontend/Dockerfile .
```
