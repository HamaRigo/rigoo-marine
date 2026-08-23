# Database Security Configuration

This document describes the production-ready database connection layer for the Rigoo Marine backend.

## Overview

The application uses **Spring Boot + HikariCP** for PostgreSQL connections with the following security features:

- No hardcoded credentials (environment variables only)
- TLS/SSL encryption enforced in production
- Least-privilege database user
- Connection pooling with resource limits
- Structured audit logging
- Fail-fast configuration validation

## Quick Start

### 1. Set up environment variables

```bash
# Copy the template
cp env.template .env

# Edit .env with your actual values
# NEVER commit .env to git
```

### 2. Create the database user (Production)

Run the SQL script as a superuser:

```bash
psql -U postgres -d rigoomarine -f rigoo-marine-backend/db/security/01_create_database_user.sql
```

Update the password in the script before running!

### 3. Enable SSL for production

In `.env`:
```
DB_SSL_ENABLED=true
DB_SSL_ROOT_CERT=/path/to/ca-cert.pem  # Optional: for self-signed certs
```

### 4. Run with production profile

```bash
java -Dspring.profiles.active=production -jar client-module.jar
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | rigoomarine | Database name |
| `DB_USERNAME` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `DB_SSL_ENABLED` | false | Enforce TLS (true for prod) |
| `DB_SSL_ROOT_CERT` | - | CA certificate path |
| `DB_POOL_MAX_SIZE` | 20 | Max connections |
| `DB_POOL_MIN_IDLE` | 5 | Minimum idle connections |
| `DB_POOL_IDLE_TIMEOUT` | 300000 | Idle timeout (5 min) |
| `DB_POOL_CONNECTION_TIMEOUT` | 30000 | Connection timeout (30s) |
| `DB_POOL_MAX_LIFETIME` | 1800000 | Max connection lifetime (30 min) |
| `DB_QUERY_TIMEOUT` | 30000 | Query timeout (30s) |

## Security Features

### 1. No Secrets in Code

All credentials come from environment variables. The `.env` file is in `.gitignore`.

### 2. Encrypted Connections

Production profile enforces `sslmode=verify-full`:
- All traffic encrypted via TLS
- Server certificate validated
- Man-in-the-middle attacks prevented

### 3. Least Privilege User

The `rigoomarine_app` user has:
- `SELECT, INSERT, UPDATE, DELETE` on tables
- `USAGE, SELECT` on sequences
- `EXECUTE` on functions
- NO `CREATE`, `ALTER`, `DROP` permissions

### 4. Connection Pooling (HikariCP)

Prevents resource exhaustion:
- Max 20 concurrent connections
- 30-second connection timeout
- 30-minute max connection lifetime
- Connection leak detection (60s threshold)

### 5. Parameterized Queries

Using Spring Data JPA with Hibernate:
- All queries use parameter binding
- No string concatenation for SQL
- SQL injection prevented by default

### 6. Audit Logging

`DatabaseAuditLogger` logs:
- Failed connection attempts
- Slow queries (>30s)
- Connection events

Logs are structured (JSON) for SIEM integration.

## Production Checklist

- [ ] Change default PostgreSQL password
- [ ] Generate secure JWT secrets (min 32 chars)
- [ ] Enable SSL (`DB_SSL_ENABLED=true`)
- [ ] Create least-privilege database user
- [ ] Set appropriate pool size for expected load
- [ ] Configure log aggregation (CloudWatch, Splunk, etc.)
- [ ] Set up database monitoring (CloudWatch, Datadog)
- [ ] Enable PostgreSQL slow query log
- [ ] Configure backup and point-in-time recovery

## Troubleshooting

### Connection refused

Check PostgreSQL is running:
```bash
pg_isready -h localhost -p 5432
```

### SSL certificate verification failed

For production with self-signed certs, provide the CA:
```
DB_SSL_ROOT_CERT=/path/to/ca-cert.pem
```

For local development, disable SSL:
```
DB_SSL_ENABLED=false
```

### Connection pool exhausted

Increase pool size or investigate slow queries:
```
DB_POOL_MAX_SIZE=50
```

Monitor slow queries in logs (marked with `SLOW_QUERY`).

## Files

| File | Purpose |
|------|---------|
| `.env` | Actual secrets (gitignored) |
| `env.template` | Safe template for developers (copy to `.env`) |
| `DatabaseConfig.java` | Secure datasource configuration |
| `DatabaseAuditLogger.java` | Security audit logging |
| `application.yml` | Spring Boot configuration |
| `db/security/01_create_database_user.sql` | Least-privilege user setup |
