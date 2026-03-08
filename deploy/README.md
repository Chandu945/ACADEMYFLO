# PlayConnect — Deployment Guide

## Architecture

```
                  ┌─────────────────────────────────────┐
                  │           Docker Network             │
  Client ──────► │  nginx (:80/:443)                    │
                  │    ├── /api/*  ──► api (:3001)       │
                  │    └── /*      ──► admin-web (:3002)  │
                  │                        │             │
                  │                    MongoDB           │
                  │               (staging: local)       │
                  │               (prod: Atlas)          │
                  └─────────────────────────────────────┘
```

Only nginx is publicly exposed. API and admin-web communicate on an internal Docker network.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- Domain + TLS certificates (optional — HTTP fallback available)
- For production: external MongoDB (Atlas recommended)

## Quick Start

### Staging

```bash
cd deploy/
cp .env.staging.example .env.staging
# Edit .env.staging with real values

docker compose -f docker-compose.staging.yml up -d
```

### Production

```bash
cd deploy/
cp .env.prod.example .env.prod
# Edit .env.prod with real values (including Atlas connection string)

docker compose -f docker-compose.prod.yml up -d
```

## Secrets Strategy

| Environment | Method                                | Details                                         |
| ----------- | ------------------------------------- | ----------------------------------------------- |
| Development | Local `.env` files                    | `.env.example` at repo root                     |
| Staging     | `.env` on server + CI secrets         | Deployed via SSH; CI secrets in GitHub Settings |
| Production  | AWS SSM/Secrets Manager (recommended) | `.env` fallback supported                       |

### Secret Rotation Procedure

1. Generate new secret values
2. Update in secret store (AWS SSM or `.env` file)
3. Restart affected services:
   ```bash
   docker compose -f docker-compose.prod.yml restart api
   ```
4. Verify via smoke check:
   ```bash
   node scripts/smoke-check.mjs
   ```

### CI/CD Secrets (GitHub)

Required secrets per environment:

| Secret        | Staging                           | Production                |
| ------------- | --------------------------------- | ------------------------- |
| `*_HOST`      | Staging server IP                 | Production server IP      |
| `*_USER`      | SSH user                          | SSH user                  |
| `*_SSH_KEY`   | SSH private key                   | SSH private key           |
| `*_API_URL`   | `https://staging.playconnect.app` | `https://playconnect.app` |
| `*_ADMIN_URL` | `https://staging.playconnect.app` | `https://playconnect.app` |

## Networking

- **Internal network**: `playconnect-net` (bridge driver)
- **Publicly exposed**: only nginx on ports 80 and 443
- **Service discovery**: Docker DNS (`api:3001`, `admin-web:3002`)
- API and admin-web use `expose` (not `ports`) — no host binding

## Health Checks

### Liveness vs Readiness

| Probe     | Endpoint                       | Purpose                                        |
| --------- | ------------------------------ | ---------------------------------------------- |
| Liveness  | `GET /api/v1/health/liveness`  | Is the process alive? Restart if failing.      |
| Readiness | `GET /api/v1/health/readiness` | Can it serve traffic? Stop routing if failing. |

### Expected Responses

**Liveness (200)**:

```json
{
  "status": "ok",
  "service": "playconnect-api",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "uuid"
}
```

**Readiness (200)** — healthy:

```json
{
  "status": "ok",
  "service": "playconnect-api",
  "time": "2024-01-15T10:30:00.000Z",
  "dependencies": { "mongodb": "up" },
  "requestId": "uuid"
}
```

**Readiness (503)** — database down:

```json
{
  "status": "unavailable",
  "service": "playconnect-api",
  "time": "2024-01-15T10:30:00.000Z",
  "dependencies": { "mongodb": "down" },
  "requestId": "uuid"
}
```

## Smoke Check

Run after deployment to verify all services are responding:

```bash
# Local
node scripts/smoke-check.mjs

# Custom URLs
API_URL=https://staging.playconnect.app ADMIN_URL=https://staging.playconnect.app node scripts/smoke-check.mjs
```

The script checks liveness, readiness, and admin-web endpoints with retries.

## Backup Operations

See [`scripts/backup/README.md`](../scripts/backup/README.md) for full documentation.

Quick reference:

```bash
# Backup
MONGODB_URI="mongodb://..." ./scripts/backup/mongodump-backup.sh

# Restore (drops existing data!)
MONGODB_URI="mongodb://..." BACKUP_FILE="/backups/2024-01-15_02-00.tar.gz" \
  ./scripts/backup/restore-mongodump.sh --confirm
```

## TLS Configuration

1. Place certificate and key files on the server
2. Set `SSL_CERT_PATH` and `SSL_KEY_PATH` in `.env.*`
3. Uncomment the HTTPS server block in `nginx/sites-enabled/playconnect.conf`
4. Uncomment the HTTP→HTTPS redirect in the port 80 block
5. Restart nginx: `docker compose restart nginx`

## Troubleshooting

### Services won't start

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 api
docker compose -f docker-compose.prod.yml logs --tail=50 nginx
```

### API returns 503

MongoDB is unreachable. Check:

```bash
# Staging (local mongo)
docker compose -f docker-compose.staging.yml logs mongo

# Production (Atlas)
# Verify MONGODB_URI in .env.prod and network connectivity
```

### Nginx returns 502 Bad Gateway

Backend service is not running or not on the Docker network:

```bash
docker compose -f docker-compose.prod.yml ps
docker network inspect deploy_playconnect-net
```

### Health check keeps failing

```bash
# Test directly from within the Docker network
docker compose exec nginx wget -qO- http://api:3001/api/v1/health/liveness
```
