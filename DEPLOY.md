# Academyflo — Deployment Guide

Complete step-by-step guide to deploy the Academyflo platform (API + Admin Web + User Web).

This guide covers two deployment options:
- **Option A: Render** (recommended for early stage — simple, low cost, no DevOps)
- **Option B: Self-Hosted / AWS** (recommended once you have 500+ users)

---

## Table of Contents

### Render Deployment (Recommended to Start)
1. [Render — Overview & Pricing](#render--overview--pricing)
2. [Render — Step 1: Set Up MongoDB Atlas](#render--step-1-set-up-mongodb-atlas)
3. [Render — Step 2: Create Render Account & Connect GitHub](#render--step-2-create-render-account--connect-github)
4. [Render — Step 3: Deploy Using Blueprint](#render--step-3-deploy-using-blueprint)
5. [Render — Step 4: Configure Environment Variables](#render--step-4-configure-environment-variables)
6. [Render — Step 5: Verify Deployment](#render--step-5-verify-deployment)
7. [Render — Step 6: Set Up Custom Domain & SSL](#render--step-6-set-up-custom-domain--ssl)
8. [Render — Step 7: Update Mobile App URLs](#render--step-7-update-mobile-app-urls)
9. [Render — Step 8: Set Up Auto-Deploy](#render--step-8-set-up-auto-deploy)
10. [Render — Monitoring & Logs](#render--monitoring--logs)
11. [Render — Scaling Up](#render--scaling-up)
12. [Render — Migrating to AWS Later](#render--migrating-to-aws-later)

### Self-Hosted / AWS Deployment (For Scale)
13. [Architecture Overview](#architecture-overview)
14. [Prerequisites](#prerequisites)
15. [Phase 1 — Provision the Server](#phase-1--provision-the-server)
16. [Phase 2 — Install Docker](#phase-2--install-docker)
17. [Phase 3 — Generate Secrets](#phase-3--generate-secrets)
18. [Phase 4 — Create Environment Files](#phase-4--create-environment-files)
19. [Phase 5 — Set Up GitHub Secrets](#phase-5--set-up-github-secrets)
20. [Phase 6 — Set Up MongoDB](#phase-6--set-up-mongodb)
21. [Phase 7 — Set Up SSL/TLS (HTTPS)](#phase-7--set-up-ssltls-https)
22. [Phase 8 — First Manual Deployment](#phase-8--first-manual-deployment)
23. [Phase 9 — Verify Health](#phase-9--verify-health)
24. [Phase 10 — Enable Automated CI/CD](#phase-10--enable-automated-cicd)
13. [Phase 11 — Set Up Monitoring](#phase-11--set-up-monitoring)
14. [Phase 12 — Set Up Backups](#phase-12--set-up-backups)
15. [Phase 13 — Load Test and Verify at Scale](#phase-13--load-test-and-verify-at-scale)
16. [Rollback Procedure](#rollback-procedure)
17. [DNS Configuration](#dns-configuration)
18. [Firewall Configuration](#firewall-configuration)
19. [Secret Rotation](#secret-rotation)
20. [Quick Reference](#quick-reference)
21. [Troubleshooting](#troubleshooting)

---

# OPTION A: Deploy on Render (Recommended to Start)

## Render — Overview & Pricing

Render gives you managed hosting with zero DevOps. Push code → it builds and deploys automatically. SSL, health checks, and auto-restarts are built in.

### Monthly Cost Estimate

| Service | Render Plan | Price | What You Get |
|---------|-------------|-------|-------------|
| **API** (NestJS) | Starter | $7/mo | 512MB RAM, 0.5 CPU, auto-deploy |
| **Admin Web** (Next.js) | Free | $0/mo | Only super admin uses it. Spins down after 15 min inactivity (~30s cold start). |
| **User Web** (Next.js) | Starter | $7/mo | 512MB RAM, 0.5 CPU |
| **Redis** | Starter | $7/mo | 25MB, cache + job queues |
| **MongoDB Atlas** | M0 Free / M10 | $0-57/mo | Free tier for dev, M10 for prod |
| | | | |
| **Total (dev/staging)** | | **~$21/mo** | With Atlas free tier |
| **Total (production)** | | **~$78/mo** | With Atlas M10 |

> **Compare**: A self-hosted AWS EC2 `c6i.2xlarge` costs ~$250/mo before managed DB.

### When to Upgrade from Render

Move to AWS/self-hosted when:
- You have 500+ daily active users (Render starter plan will struggle)
- You need > 2GB RAM for the API
- You need custom nginx config (rate limiting, IP blocking)
- You need multiple API instances (horizontal scaling)
- Render cold starts (free/starter tier spins down after inactivity) become a problem

Render Standard plan ($25/mo per service) handles ~500-800 concurrent users comfortably.

---

## Render — Step 1: Set Up MongoDB Atlas

You need a database before deploying. Render doesn't offer managed MongoDB, so use Atlas (MongoDB's own cloud).

### 1.1 Create Atlas Account

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Sign up
2. Create a new project: **Academyflo**

### 1.2 Create a Cluster

1. Click **Build a Database**
2. Choose your tier:
   - **M0 Free** — for development/testing (512MB storage, shared CPU)
   - **M10** ($57/mo) — for production (10GB, dedicated CPU, backups)
3. **Region**: Mumbai (`ap-south-1`) for lowest latency to India
4. **Cluster name**: `academyflo-prod`
5. Click **Create Cluster** (takes 3-5 minutes)

### 1.3 Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Username: `academyflo_app`
3. Password: Click **Auto-Generate** → **Copy and save this password**
4. Role: **Read and write to any database**
5. Click **Add User**

### 1.4 Allow Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`)
   - This is required for Render (Render IPs are dynamic)
   - Security comes from the strong password + TLS
3. Click **Confirm**

### 1.5 Get Connection String

1. Go to **Database** → Click **Connect** on your cluster
2. Choose **Drivers** → **Node.js**
3. Copy the connection string:
   ```
   mongodb+srv://academyflo_app:<password>@academyflo-prod.xxxxx.mongodb.net/academyflo?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. **Save this URI** — you'll need it in Step 4

---

## Render — Step 2: Create Render Account & Connect GitHub

### 2.1 Sign Up

1. Go to [render.com](https://render.com) → **Get Started Free**
2. Sign up with your **GitHub account** (simplest)

### 2.2 Connect Repository

1. In Render dashboard → **Account Settings** → **Git Providers**
2. Authorize Render to access your GitHub repos
3. Select the **academyflo** repository

---

## Render — Step 3: Deploy Using Blueprint

The project includes a `render.yaml` blueprint that configures all services automatically.

### 3.1 Create Blueprint

1. Go to Render dashboard → **Blueprints** → **New Blueprint Instance**
2. Select your **academyflo** repository
3. Render auto-detects the `render.yaml` file
4. Review the services it will create:
   - `academyflo-api` (Web Service, Docker)
   - `academyflo-admin` (Web Service, Docker)
   - `academyflo-app` (Web Service, Docker)
   - `academyflo-redis` (Redis)
5. Click **Apply**

### 3.2 Wait for Build

First build takes 10-15 minutes (Docker images). Subsequent deploys are faster due to layer caching.

Watch the build logs in Render dashboard for each service.

---

## Render — Step 4: Configure Environment Variables

After the blueprint creates the services, you need to set the secrets that are marked `sync: false`.

### 4.1 Configure API Environment Variables

Go to **academyflo-api** → **Environment** → **Add Environment Variable**

Set these (the others are auto-configured by the blueprint):

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas connection string from Step 1.5 |
| `CORS_ALLOWED_ORIGINS` | `https://academyflo-admin.onrender.com,https://academyflo-app.onrender.com` |
| `SMTP_HOST` | Your SMTP host (e.g., `smtp.sendgrid.net`) |
| `SMTP_USER` | Your SMTP username |
| `SMTP_PASS` | Your SMTP password/API key |
| `SMTP_FROM` | `noreply@yourdomain.com` |
| `CASHFREE_CLIENT_ID` | Your Cashfree production client ID |
| `CASHFREE_CLIENT_SECRET` | Your Cashfree production secret |
| `CASHFREE_WEBHOOK_SECRET` | Your Cashfree webhook secret |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `SUPER_ADMIN_EMAIL` | `admin@yourdomain.com` |
| `SUPER_ADMIN_PASSWORD` | A strong password (save it!) |

> **Note**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `REDIS_URL` are auto-generated by the blueprint.

### 4.2 Configure Admin Web Environment Variables

Go to **academyflo-admin** → **Environment**

| Key | Value |
|-----|-------|
| `API_BASE_URL` | `https://academyflo-api.onrender.com` (or use internal URL if available) |
| `COOKIE_SECRET` | Auto-generated by blueprint |
| `COOKIE_SALT` | Auto-generated by blueprint |

> **Render Internal Communication**: If services are in the same region, use the internal URL format: `http://academyflo-api:3001` (free, no egress charges). Check Render docs for internal hostname format.

### 4.3 Configure User Web Environment Variables

Go to **academyflo-app** → **Environment**

Same as admin web but with different cookie secrets (auto-generated separately).

| Key | Value |
|-----|-------|
| `API_BASE_URL` | `https://academyflo-api.onrender.com` |
| `COOKIE_SECRET` | Auto-generated by blueprint |
| `COOKIE_SALT` | Auto-generated by blueprint |

### 4.4 Trigger Redeploy

After setting env vars:
1. Go to each service → **Manual Deploy** → **Deploy latest commit**
2. Or push a new commit to trigger auto-deploy

---

## Render — Step 5: Verify Deployment

### 5.1 Check Service Status

In Render dashboard, all services should show **Live** (green).

### 5.2 Test API

```bash
# Replace with your actual Render URL
curl https://academyflo-api.onrender.com/api/v1/health/liveness
# Expected: {"status":"ok","service":"academyflo-api","time":"..."}

curl https://academyflo-api.onrender.com/api/v1/health/readiness
# Expected: {"status":"ok","dependencies":{"mongodb":"up"},"time":"..."}
```

### 5.3 Test Web Apps

Open in browser:
- **Admin**: `https://academyflo-admin.onrender.com` → Should show login page
- **User Web**: `https://academyflo-app.onrender.com` → Should show login page

### 5.4 Test Super Admin Login

```bash
curl -X POST https://academyflo-api.onrender.com/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your-super-admin-password"}'
# Expected: {"data":{"accessToken":"...","refreshToken":"..."}}
```

---

## Render — Step 6: Set Up Custom Domain & SSL

### 6.1 Add Custom Domain

1. Go to each service in Render → **Settings** → **Custom Domains**
2. Add your domains:

| Service | Custom Domain |
|---------|--------------|
| `academyflo-api` | `api.yourdomain.com` |
| `academyflo-admin` | `admin.yourdomain.com` |
| `academyflo-app` | `app.yourdomain.com` |

3. Render gives you a CNAME target for each (e.g., `academyflo-api.onrender.com`)

### 6.2 Configure DNS

At your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

| Record | Type | Name | Value |
|--------|------|------|-------|
| API | CNAME | `api` | `academyflo-api.onrender.com` |
| Admin | CNAME | `admin` | `academyflo-admin.onrender.com` |
| User App | CNAME | `app` | `academyflo-app.onrender.com` |

### 6.3 SSL is Automatic

Render automatically provisions and renews SSL certificates via Let's Encrypt. No configuration needed. HTTPS just works.

### 6.4 Update CORS After Custom Domain

Go to **academyflo-api** → **Environment** → Update:

```
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
```

---

## Render — Step 7: Update Mobile App URLs

After deployment, update the mobile app to point to your Render API.

Edit `/apps/mobile/src/infra/env.ts`:

```typescript
const ENV_CONFIG = {
  development: {
    API_BASE_URL: Platform.OS === 'android'
      ? 'http://10.0.2.2:3001'
      : 'http://localhost:3001',
  },
  staging: {
    API_BASE_URL: 'https://academyflo-api.onrender.com',  // Or your custom domain
  },
  production: {
    API_BASE_URL: 'https://api.yourdomain.com',  // Your custom domain
  },
};
```

### Set Up Cashfree Webhook URL

In your Cashfree dashboard:
1. Go to **Settings** → **Webhooks**
2. Set webhook URL to: `https://api.yourdomain.com/api/v1/subscription-payments/webhook`
3. Copy the webhook secret to Render env vars

---

## Render — Step 8: Set Up Auto-Deploy

### Auto-Deploy on Push (Default)

Render auto-deploys when you push to the branch connected to the service (usually `main`). This is enabled by default.

### Branch-Based Deployment

For staging/production separation:

1. **Staging**: Connect services to `main` branch
2. **Production**: Create separate services connected to `production` branch

Or use a single set of services with `main` branch and control releases via merge.

### Deploy from GitHub Actions (Optional)

If you want to keep using your existing CI pipeline and only deploy after tests pass:

1. Disable auto-deploy in Render (Settings → Build & Deploy → Auto-Deploy = Off)
2. Use Render's Deploy Hook instead:

Get the deploy hook URL from each service (Settings → Deploy Hook). Then add to your GitHub Actions:

```yaml
- name: Deploy API to Render
  run: curl -X POST "${{ secrets.RENDER_API_DEPLOY_HOOK }}"
```

---

## Render — Monitoring & Logs

### View Logs

1. Go to service → **Logs**
2. Real-time log streaming
3. Search and filter by text

### Metrics

Render provides (on paid plans):
- CPU usage
- Memory usage
- Request count
- Response time (p50, p95, p99)
- Bandwidth

### Health Checks

The API has a health check configured at `/api/v1/health/liveness`. Render will:
- Check every 30 seconds
- Restart the service if 3 consecutive checks fail
- Show health status in the dashboard

### Alerts

1. Go to **Account Settings** → **Notifications**
2. Enable notifications for:
   - Deploy failures
   - Service crashes
   - Health check failures

---

## Render — Scaling Up

### When to Upgrade Plans

| Signal | Action |
|--------|--------|
| Response time > 500ms consistently | Upgrade API to **Standard** ($25/mo, 2GB RAM) |
| Redis memory > 20MB | Upgrade Redis to **Standard** ($20/mo, 100MB) |
| Users report slow page loads | Upgrade web apps to **Standard** |
| 429 rate limit errors in logs | Increase rate limits in API code |
| MongoDB slow queries | Upgrade Atlas to M10+ or add indexes |

### Render Plan Comparison

| Plan | RAM | CPU | Price | Good For |
|------|-----|-----|-------|----------|
| **Free** | 512MB | Shared | $0 | Testing only (spins down after 15 min inactivity) |
| **Starter** | 512MB | 0.5 | $7/mo | Early stage, < 100 users |
| **Standard** | 2GB | 1.0 | $25/mo | Growth stage, 100-800 users |
| **Pro** | 4GB | 2.0 | $85/mo | Scale, 800-2000 users |
| **Pro Plus** | 8GB | 4.0 | $175/mo | High traffic, 2000+ users |

### Scaling Steps

1. Go to service → **Settings** → **Instance Type**
2. Select the new plan
3. Click **Save Changes**
4. Zero-downtime upgrade (Render handles it)

---

## Render — Migrating to AWS Later

When you're ready to move to AWS, the migration path is straightforward because the app is already Dockerized:

### What Changes

| Component | On Render | On AWS |
|-----------|-----------|--------|
| API | Render Web Service | ECS Fargate / EC2 with Docker |
| Web Apps | Render Web Service | ECS Fargate / S3 + CloudFront |
| Redis | Render Redis | ElastiCache Redis |
| MongoDB | Atlas (stays the same!) | Atlas (stays the same!) |
| SSL | Render auto-cert | ACM + ALB |
| CI/CD | Render auto-deploy | GitHub Actions + ECR + ECS |

### Migration Steps

1. **MongoDB stays on Atlas** — no change needed
2. **Set up AWS infrastructure** (ECS, ALB, ElastiCache)
3. **Push Docker images to ECR** instead of relying on Render
4. **Update GitHub Actions** to deploy to ECS
5. **Update DNS** to point to AWS ALB
6. **Test thoroughly** on AWS before switching DNS
7. **Switch DNS** (CNAME from Render → AWS ALB)
8. **Keep Render running for 48 hours** as fallback
9. **Delete Render services** after confirming AWS is stable

### Time Estimate

- AWS setup: 2-3 days (if familiar with ECS)
- Testing: 1-2 days
- DNS cutover: 30 minutes
- Total: ~1 week

---

# OPTION B: Self-Hosted / AWS Deployment (For Scale)

> Use this section when you outgrow Render (typically 500+ daily users or when you need custom infrastructure).

---

## Architecture Overview

```
Internet
  │
  ▼
nginx (ports 80/443 — TLS, gzip, rate limiting)
  ├── /api/*  → api:3001   (NestJS, 3 replicas in prod, least_conn load balancing)
  ├── /app/*  → user-web:3003  (Next.js user portal)
  └── /*      → admin-web:3002 (Next.js super-admin panel)
                    │
      ┌─────────────┼─────────────┐
      │             │             │
   Redis:6379   MongoDB       MongoDB
   (cache +     (primary)     (secondary — reads)
    job queues)
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **api** | 3001 | NestJS backend (3 replicas in prod, 2 in staging) |
| **admin-web** | 3002 | Next.js super-admin panel |
| **user-web** | 3003 | Next.js user app (Owner / Staff / Parent) |
| **redis** | 6379 | Cache (auth lookups) + BullMQ job queues (email, notifications) |
| **mongo** | 27017 | MongoDB 7 with replica set (staging only — prod uses Atlas) |
| **nginx** | 80/443 | Reverse proxy, TLS termination, rate limiting, gzip |

---

## Prerequisites

### Software Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | v2+ | Service orchestration |
| Git | 2.30+ | Code deployment |
| Node.js | 20+ | Local builds (optional) |
| certbot | latest | SSL certificate management (if not using Cloudflare) |

### Server Requirements

| Environment | RAM | CPU | Disk | OS |
|-------------|-----|-----|------|-----|
| **Staging** | 8 GB | 4 cores | 40 GB SSD | Ubuntu 22.04 LTS |
| **Production** | 16 GB | 8 cores | 80 GB SSD | Ubuntu 22.04 LTS |

### External Services Required

| Service | Purpose | Required For |
|---------|---------|-------------|
| **MongoDB Atlas** (or self-hosted) | Database | Production |
| **SMTP Provider** (SendGrid / Mailgun / SES) | Email sending | Fee reminders, OTP, notifications |
| **Cashfree** | Payment gateway | Subscription + fee payments |
| **Cloudinary** | Image storage | Profile photos, event gallery |
| **GitHub** | Code hosting + CI/CD | Automated deployments |

---

## Phase 1 — Provision the Server

### Option A: AWS EC2

```bash
# Recommended instance type
# Staging: t3.xlarge (4 vCPU, 16 GB RAM)
# Production: c6i.2xlarge (8 vCPU, 16 GB RAM)

# Use Ubuntu 22.04 LTS AMI
# Attach 80 GB gp3 EBS volume
# Security group: allow inbound 22 (SSH), 80, 443
```

### Option B: DigitalOcean

```bash
# Staging: s-4vcpu-8gb ($48/mo)
# Production: c-8-16gib ($96/mo)
# Region: BLR1 (Bangalore) for lowest latency to India
```

### Option C: Hetzner (Cost-Effective)

```bash
# Staging: CPX31 (4 vCPU, 8 GB, $15/mo)
# Production: CPX51 (8 vCPU, 16 GB, $30/mo)
# Region: ash (Ashburn) or similar
```

After provisioning, note the server IP address.

---

## Phase 2 — Install Docker

SSH into your server:

```bash
ssh ubuntu@<server-ip>
```

Install Docker and Docker Compose:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version        # Should show 24.x+
docker compose version  # Should show v2.x+

# IMPORTANT: Log out and back in for group changes
exit
ssh ubuntu@<server-ip>

# Verify docker works without sudo
docker ps
```

Create the deployment directory:

```bash
sudo mkdir -p /opt/academyflo
sudo chown $USER:$USER /opt/academyflo
```

---

## Phase 3 — Generate Secrets

Run these commands on your **local machine** to generate all required secrets. Save every value in a password manager.

```bash
echo "=== JWT Secrets ==="
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 48)"

echo ""
echo "=== Admin Web Cookie Secrets ==="
echo "ADMIN_COOKIE_SECRET=$(openssl rand -hex 32)"
echo "ADMIN_COOKIE_SALT=$(openssl rand -hex 16)"

echo ""
echo "=== User Web Cookie Secrets (must differ from admin!) ==="
echo "USER_COOKIE_SECRET=$(openssl rand -hex 32)"
echo "USER_COOKIE_SALT=$(openssl rand -hex 16)"

echo ""
echo "=== Super Admin Password ==="
echo "SUPER_ADMIN_PASSWORD=$(openssl rand -base64 24)"

echo ""
echo "=== Swagger Token (staging only) ==="
echo "SWAGGER_TOKEN=$(openssl rand -hex 24)"
```

> **IMPORTANT**: Admin-web and user-web MUST have different `COOKIE_SECRET` and `COOKIE_SALT` values. Using the same values would let a session from one app be valid in the other.

---

## Phase 4 — Create Environment Files

### 4.1 Production Environment File

SSH to your **production** server:

```bash
cd /opt/academyflo
mkdir -p deploy
nano deploy/.env.prod
```

Paste and fill in all values (replace every `<...>`):

```env
# ===================================================
# Academyflo — Production Environment Configuration
# ===================================================

# -- Application --
NODE_ENV=production
APP_ENV=production
TZ=Asia/Kolkata
PORT=3001
LOG_LEVEL=info

# -- MongoDB (Atlas recommended) --
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/academyflo?retryWrites=true&w=majority
MONGODB_READ_PREFERENCE=secondaryPreferred

# -- Redis --
REDIS_URL=redis://redis:6379
CACHE_TTL_SECONDS=300

# -- JWT --
JWT_ACCESS_SECRET=<generated-jwt-access-secret>
JWT_REFRESH_SECRET=<generated-jwt-refresh-secret>
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
BCRYPT_COST=12

# -- CORS --
CORS_ALLOWED_ORIGINS=https://<your-domain>,https://app.<your-domain>

# -- SMTP (Email) --
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
SMTP_FROM=noreply@<your-domain>
SMTP_TIMEOUT_MS=10000
EMAIL_DRY_RUN=false

# -- Cashfree (PRODUCTION — not sandbox!) --
CASHFREE_CLIENT_ID=<production-client-id>
CASHFREE_CLIENT_SECRET=<production-client-secret>
CASHFREE_WEBHOOK_SECRET=<production-webhook-secret>
CASHFREE_BASE_URL=https://api.cashfree.com/pg
CASHFREE_API_VERSION=2025-01-01

# -- Cloudinary --
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# -- Super Admin --
SUPER_ADMIN_EMAIL=admin@<your-domain>
SUPER_ADMIN_PASSWORD=<generated-super-admin-password>

# -- Features --
FEE_REMINDER_ENABLED=true
SUBSCRIPTION_TIER_CRON_ENABLED=true
SWAGGER_ENABLED=false

# -- Reliability --
EXTERNAL_CALL_TIMEOUT_MS=10000
EXTERNAL_CALL_RETRIES=1
SHUTDOWN_GRACE_MS=20000

# -- Admin Web --
NEXT_PUBLIC_APP_ENV=production
API_BASE_URL=http://api:3001
COOKIE_SECRET=<generated-admin-cookie-secret>
COOKIE_SALT=<generated-admin-cookie-salt>

# -- User Web --
USER_WEB_COOKIE_SECRET=<generated-user-cookie-secret>
USER_WEB_COOKIE_SALT=<generated-user-cookie-salt>

# -- Docker Images --
REGISTRY=ghcr.io/<your-github-org>
IMAGE_TAG=latest
```

Lock down the file permissions:

```bash
chmod 600 deploy/.env.prod
```

### 4.2 Staging Environment File

```bash
nano deploy/.env.staging
```

Key differences from production:

```env
APP_ENV=staging
MONGODB_URI=mongodb://mongo:27017/academyflo_staging?replicaSet=rs0
CASHFREE_BASE_URL=https://sandbox.cashfree.com/pg
EMAIL_DRY_RUN=true
SWAGGER_ENABLED=true
SWAGGER_TOKEN=<generated-swagger-token>
FEE_REMINDER_ENABLED=false
IMAGE_TAG=staging-latest
```

Use **different** JWT secrets, cookie secrets, and super admin password from production.

---

## Phase 5 — Set Up GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

### Staging Secrets

| Secret Name | Value |
|---|---|
| `STAGING_HOST` | Staging server IP address |
| `STAGING_USER` | SSH username (e.g., `ubuntu`) |
| `STAGING_SSH_KEY` | Full SSH private key (contents of `~/.ssh/id_rsa`) |
| `STAGING_API_URL` | `https://staging.<your-domain>` |
| `STAGING_ADMIN_URL` | `https://staging.<your-domain>` |
| `STAGING_USER_URL` | `https://staging.<your-domain>/app` |

### Production Secrets

| Secret Name | Value |
|---|---|
| `PRODUCTION_HOST` | Production server IP address |
| `PRODUCTION_USER` | SSH username |
| `PRODUCTION_SSH_KEY` | Full SSH private key |
| `PRODUCTION_API_URL` | `https://<your-domain>` |
| `PRODUCTION_ADMIN_URL` | `https://<your-domain>` |
| `PRODUCTION_USER_URL` | `https://<your-domain>/app` |

### How to Generate SSH Keys

If you don't have SSH keys for the deploy user:

```bash
# On your LOCAL machine
ssh-keygen -t ed25519 -C "deploy@academyflo" -f ~/.ssh/academyflo_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/academyflo_deploy.pub ubuntu@<server-ip>

# The PRIVATE key goes into GitHub secrets
cat ~/.ssh/academyflo_deploy
```

---

## Phase 6 — Set Up MongoDB

### Option A: MongoDB Atlas (Recommended for Production)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create an account
2. Create a new project: "Academyflo"
3. Create a cluster:
   - **Tier**: M10 (production) or M0 Free (testing)
   - **Region**: Mumbai (ap-south-1) for lowest latency to India
   - **Replica set**: Enabled by default on M10+
4. Create a database user:
   - Username: `academyflo_prod`
   - Password: Auto-generate a strong password
   - Role: `readWriteAnyDatabase`
5. Configure network access:
   - Add your production server IP
   - Or add `0.0.0.0/0` with strong credentials (less secure, more flexible)
6. Get the connection string:
   - Click "Connect" → "Connect your application"
   - Copy the URI and replace `<password>` with your DB user password
   - Add to `.env.prod` as `MONGODB_URI`
7. Enable automated backups:
   - Go to cluster settings → Backup
   - Enable continuous backup (available on M10+)

### Option B: Self-Hosted MongoDB (Staging)

The staging Docker Compose already includes a MongoDB 7 container with replica set. No manual setup needed — it auto-initializes on first start.

---

## Phase 7 — Set Up SSL/TLS (HTTPS)

### Option A: Let's Encrypt with Certbot (Free)

```bash
# Install certbot
sudo apt install certbot -y

# Stop nginx if running (certbot needs port 80)
docker compose -f deploy/docker-compose.prod.yml down nginx 2>/dev/null || true

# Generate certificate
sudo certbot certonly --standalone \
  -d <your-domain> \
  -d www.<your-domain> \
  --email admin@<your-domain> \
  --agree-tos \
  --non-interactive

# Verify certificate
sudo ls /etc/letsencrypt/live/<your-domain>/
# Should show: fullchain.pem, privkey.pem, cert.pem, chain.pem
```

Enable HTTPS in nginx config:

```bash
cd /opt/academyflo
nano deploy/nginx/sites-enabled/academyflo.conf
```

Uncomment the HTTPS server block (port 443) and update certificate paths:

```nginx
ssl_certificate     /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

Add certificate volume mounts to nginx service in `deploy/docker-compose.prod.yml`:

```yaml
nginx:
  volumes:
    - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./deploy/nginx/sites-enabled:/etc/nginx/sites-enabled:ro
    - /etc/letsencrypt/live/<your-domain>/fullchain.pem:/etc/nginx/ssl/cert.pem:ro
    - /etc/letsencrypt/live/<your-domain>/privkey.pem:/etc/nginx/ssl/key.pem:ro
```

Set up auto-renewal:

```bash
sudo crontab -e
```

Add:

```cron
0 3 * * * certbot renew --quiet --post-hook "docker exec academyflo-nginx nginx -s reload"
```

### Option B: Cloudflare (Easiest — No Certs Needed)

1. Add your domain to [Cloudflare](https://dash.cloudflare.com)
2. Update nameservers at your domain registrar to Cloudflare's
3. In Cloudflare dashboard:
   - **SSL/TLS → Overview**: Set to "Full (Strict)"
   - **SSL/TLS → Edge Certificates**: Enable "Always Use HTTPS"
   - **SSL/TLS → Origin Server**: Create an Origin Certificate and install on your server
4. Cloudflare handles TLS termination for free

---

## Phase 8 — First Manual Deployment

### 8.1 Clone the Repository

```bash
cd /opt/academyflo
git clone https://github.com/<your-org>/academyflo.git .
```

### 8.2 Install Dependencies (For Local Build)

```bash
npm install
```

### 8.3 Build Docker Images

```bash
# Build all 3 images
docker build -f apps/api/Dockerfile -t academyflo-api .
docker build -f apps/admin-web/Dockerfile -t academyflo-admin-web .
docker build -f apps/user-web/Dockerfile -t academyflo-user-web .
```

This will take 5-10 minutes on first build.

### 8.4 Start All Services

For **staging** (includes local MongoDB):

```bash
cd /opt/academyflo
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d
```

For **production** (external MongoDB Atlas):

```bash
cd /opt/academyflo
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d
```

### 8.5 Watch the Startup

```bash
# Watch all logs
docker compose -f deploy/docker-compose.prod.yml logs -f

# Or watch specific services
docker compose -f deploy/docker-compose.prod.yml logs api -f
docker compose -f deploy/docker-compose.prod.yml logs redis -f
```

Wait until you see:

```
api-1  | [Nest] LOG [NestApplication] Nest application successfully started
api-2  | [Nest] LOG [NestApplication] Nest application successfully started
api-3  | [Nest] LOG [NestApplication] Nest application successfully started
redis  | Ready to accept connections
nginx  | start worker processes
```

### 8.6 Verify Containers Are Running

```bash
docker compose -f deploy/docker-compose.prod.yml ps
```

Expected output:

```
NAME                    STATUS              PORTS
academyflo-redis       Up (healthy)        6379/tcp
academyflo-api-1       Up (healthy)        3001/tcp
academyflo-api-2       Up (healthy)        3001/tcp
academyflo-api-3       Up (healthy)        3001/tcp
academyflo-admin-web   Up                  3002/tcp
academyflo-user-web    Up                  3003/tcp
academyflo-nginx       Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## Phase 9 — Verify Health

### 9.1 API Health Checks

```bash
# Liveness (is the process running?)
curl http://localhost:3001/api/v1/health/liveness
# Expected: {"status":"ok","service":"academyflo-api","time":"..."}

# Readiness (is the database connected?)
curl http://localhost:3001/api/v1/health/readiness
# Expected: {"status":"ok","dependencies":{"mongodb":"up"},"time":"..."}
```

### 9.2 Web App Health Checks

```bash
# Admin web
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
# Expected: 200

# User web
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003
# Expected: 200
```

### 9.3 Nginx Routing

```bash
# API through nginx
curl http://localhost/api/v1/health/liveness
# Expected: {"status":"ok",...}

# Admin web through nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost/
# Expected: 200 or 302

# User web through nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost/app
# Expected: 200 or 302
```

### 9.4 Redis Health

```bash
docker exec academyflo-redis redis-cli ping
# Expected: PONG

docker exec academyflo-redis redis-cli info memory | grep used_memory_human
# Expected: used_memory_human:~2-5M (initial)
```

### 9.5 Run Smoke Tests

```bash
API_URL=http://localhost:3001 \
ADMIN_URL=http://localhost:3002 \
node scripts/smoke-check.mjs
```

Expected:

```
[smoke] Checking API Liveness...        ✓ (200)
[smoke] Checking API Readiness...       ✓ (200)
[smoke] Checking Admin Web...           ✓ (200)
[smoke] All checks passed.
```

### 9.6 Test Super Admin Login

```bash
curl -X POST http://localhost:3001/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@<your-domain>","password":"<super-admin-password>"}'
```

Expected: A JSON response with `accessToken` and `refreshToken`.

---

## Phase 10 — Enable Automated CI/CD

After the manual deploy succeeds, all future deploys are automated via GitHub Actions.

### Staging Deploys

Staging deploys trigger automatically on every push to the `main` branch.

```bash
# Work on a feature branch
git checkout -b feature/my-change
# ... make changes ...
git add -A && git commit -m "feat: my change"
git push origin feature/my-change

# Create a PR, get it reviewed, merge to main
# → Staging deploy triggers automatically
```

**What happens:**
1. CI pipeline runs (lint, typecheck, tests, e2e, hardening)
2. Docker images built and pushed to GitHub Container Registry
3. SSH to staging server → `docker compose pull && up -d`
4. Smoke tests run against staging URLs

### Production Deploys

Production deploys trigger when you push a semver git tag.

```bash
# Ensure you're on main with latest code
git checkout main
git pull origin main

# Create a version tag
git tag v1.0.0
git push origin v1.0.0

# → Production deploy triggers automatically
```

**Tag format:** Must match semver — `v1.0.0`, `v1.0.1`, `v2.0.0-beta.1`, etc.

**What happens:**
1. Tag format validated
2. Docker images built with version tag and `latest`
3. SSH to production server → `docker compose pull && up -d`
4. Smoke tests run against production URLs

### Monitoring Deploy Status

Go to GitHub → **Actions** tab → watch the workflow run in real time.

---

## Phase 11 — Set Up Monitoring

### 11.1 Basic Container Monitoring

```bash
# Real-time resource usage
docker stats

# Per-service status
docker compose -f deploy/docker-compose.prod.yml ps

# Check API logs for errors
docker compose -f deploy/docker-compose.prod.yml logs api --since=1h | grep -i error

# Check for slow queries (logged at WARN level)
docker compose -f deploy/docker-compose.prod.yml logs api --since=1h | grep "slow query"
```

### 11.2 Create a Monitoring Script

```bash
nano /opt/academyflo/scripts/health-monitor.sh
chmod +x /opt/academyflo/scripts/health-monitor.sh
```

```bash
#!/bin/bash
# Academyflo Health Monitor
# Run via cron every 5 minutes

API_URL="http://localhost:3001"
ALERT_EMAIL="ops@<your-domain>"

# Check API liveness
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health/liveness" --max-time 5)
if [ "$STATUS" != "200" ]; then
  echo "[$(date)] ALERT: API liveness check failed (status: $STATUS)" | \
    mail -s "Academyflo API DOWN" "$ALERT_EMAIL" 2>/dev/null
  echo "[$(date)] ALERT: API liveness failed ($STATUS)" >> /var/log/academyflo-monitor.log
fi

# Check API readiness
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health/readiness" --max-time 5)
if [ "$STATUS" != "200" ]; then
  echo "[$(date)] ALERT: API readiness check failed (status: $STATUS)" >> /var/log/academyflo-monitor.log
fi

# Check Redis
PONG=$(docker exec academyflo-redis redis-cli ping 2>/dev/null)
if [ "$PONG" != "PONG" ]; then
  echo "[$(date)] ALERT: Redis not responding" >> /var/log/academyflo-monitor.log
fi

# Check disk usage
DISK_USAGE=$(df /opt/academyflo --output=pcent | tail -1 | tr -d ' %')
if [ "$DISK_USAGE" -gt 85 ]; then
  echo "[$(date)] WARN: Disk usage at ${DISK_USAGE}%" >> /var/log/academyflo-monitor.log
fi

# Check memory
FREE_MEM=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$FREE_MEM" -lt 1024 ]; then
  echo "[$(date)] WARN: Free memory low (${FREE_MEM}MB)" >> /var/log/academyflo-monitor.log
fi
```

Add to crontab:

```bash
crontab -e
```

```cron
*/5 * * * * /opt/academyflo/scripts/health-monitor.sh
```

### 11.3 Redis Monitoring

```bash
# Check memory usage
docker exec academyflo-redis redis-cli info memory

# Check connected clients
docker exec academyflo-redis redis-cli info clients

# Check BullMQ queues
docker exec academyflo-redis redis-cli llen bull:email:wait     # Pending emails
docker exec academyflo-redis redis-cli llen bull:notification:wait  # Pending notifications
```

---

## Phase 12 — Set Up Backups

### 12.1 MongoDB Backups

#### If Using Atlas

Atlas handles backups automatically. Verify in the Atlas dashboard:
- Go to your cluster → Backup
- Confirm continuous backup is enabled
- Test a restore in staging first

#### If Self-Hosted

```bash
# Create backup directory
sudo mkdir -p /backups
sudo chown $USER:$USER /backups

# Manual backup
cd /opt/academyflo
MONGODB_URI="mongodb://mongo:27017/academyflo?replicaSet=rs0" \
  BACKUP_DIR="/backups" \
  BACKUP_RETENTION_DAYS=7 \
  bash scripts/backup/mongodump-backup.sh

# Verify backup
ls -la /backups/
```

Automate daily backups:

```bash
crontab -e
```

```cron
# Daily backup at 2:00 AM IST
0 2 * * * cd /opt/academyflo && MONGODB_URI="mongodb://mongo:27017/academyflo?replicaSet=rs0" BACKUP_DIR="/backups" BACKUP_RETENTION_DAYS=7 bash scripts/backup/mongodump-backup.sh >> /var/log/academyflo-backup.log 2>&1
```

### 12.2 Restore from Backup

```bash
# List available backups
ls -la /backups/

# Restore (DESTRUCTIVE — drops existing data)
cd /opt/academyflo
MONGODB_URI="mongodb://mongo:27017/academyflo?replicaSet=rs0" \
  BACKUP_FILE="/backups/2026-03-17_02-00.tar.gz" \
  bash scripts/backup/restore-mongodump.sh --confirm
```

> **WARNING**: Restore drops all existing data. Always test in staging first.

### 12.3 Log Rotation

```bash
sudo nano /etc/logrotate.d/academyflo
```

```
/var/log/academyflo*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
```

---

## Phase 13 — Load Test and Verify at Scale

### 13.1 Install Load Testing Tool

```bash
sudo apt install wrk -y
```

### 13.2 Run Load Tests

```bash
# Test 1: Light load (100 concurrent connections, 30 seconds)
wrk -t4 -c100 -d30s http://localhost:3001/api/v1/health/liveness
# Target: >1000 req/sec, <50ms avg latency, 0 errors

# Test 2: Medium load (500 concurrent connections)
wrk -t8 -c500 -d30s http://localhost:3001/api/v1/health/liveness
# Target: >800 req/sec, <100ms avg latency, <1% errors

# Test 3: Heavy load (1000 concurrent connections)
wrk -t12 -c1000 -d30s http://localhost:3001/api/v1/health/liveness
# Target: >500 req/sec, <200ms avg latency, <5% errors

# Test 4: Through nginx (realistic production path)
wrk -t8 -c500 -d30s http://localhost/api/v1/health/liveness
# Target: >600 req/sec with gzip
```

### 13.3 Monitor During Load Tests

Open a separate terminal:

```bash
# Watch resource usage in real-time
docker stats

# Watch API logs for errors
docker compose -f deploy/docker-compose.prod.yml logs api -f --since=0s

# Watch Redis memory
watch -n5 'docker exec academyflo-redis redis-cli info memory | grep used_memory_human'

# Watch MongoDB connections
watch -n5 'docker exec academyflo-redis redis-cli dbsize'
```

### 13.4 Interpret Results

| Metric | Acceptable | Good | Excellent |
|--------|-----------|------|-----------|
| **Requests/sec** | >200 | >500 | >1000 |
| **Avg latency** | <500ms | <200ms | <50ms |
| **P99 latency** | <2s | <500ms | <200ms |
| **Error rate** | <5% | <1% | 0% |
| **Memory usage** | <80% | <60% | <40% |
| **CPU usage** | <90% | <70% | <50% |

---

## Rollback Procedure

### Quick Rollback (< 1 Minute)

```bash
cd /opt/academyflo/deploy

# Roll back to a specific version
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Or roll back to the staging-tested version
IMAGE_TAG=staging-latest docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify
curl http://localhost:3001/api/v1/health/liveness
```

### Full Rollback with Database Restore

```bash
# 1. Stop services
docker compose -f deploy/docker-compose.prod.yml down

# 2. Restore database
MONGODB_URI="<your-uri>" BACKUP_FILE="/backups/<latest-backup>.tar.gz" \
  bash scripts/backup/restore-mongodump.sh --confirm

# 3. Start with previous version
IMAGE_TAG=<previous-version> docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d

# 4. Verify
curl http://localhost:3001/api/v1/health/readiness
```

---

## DNS Configuration

Configure these DNS records at your domain registrar or DNS provider:

| Record | Type | Name | Value | TTL |
|--------|------|------|-------|-----|
| Production | A | `@` | `<prod-server-ip>` | 300 |
| Production | A | `www` | `<prod-server-ip>` | 300 |
| Staging | A | `staging` | `<staging-server-ip>` | 300 |
| Email (SPF) | TXT | `@` | `v=spf1 include:sendgrid.net ~all` | 3600 |
| Email (DKIM) | CNAME | Varies | Per your SMTP provider | 3600 |

---

## Firewall Configuration

### Using UFW (Ubuntu)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block everything else by default
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

### Using AWS Security Groups

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | Your IP only |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |

> **IMPORTANT**: Never expose ports 3001, 3002, 3003, 6379, 27017 to the internet. Only nginx (80/443) should be publicly accessible.

---

## Secret Rotation

### JWT Secrets (Rotate Every 6 Months)

```bash
# 1. Generate new secrets
NEW_ACCESS_SECRET=$(openssl rand -hex 48)
NEW_REFRESH_SECRET=$(openssl rand -hex 48)

# 2. Update .env.prod
nano deploy/.env.prod
# Replace JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

# 3. Restart API (all users will need to re-login)
docker compose -f deploy/docker-compose.prod.yml restart api

# 4. Verify
curl http://localhost:3001/api/v1/health/liveness
```

### Cookie Secrets (Rotate Every 6 Months)

```bash
# 1. Generate new secrets
# 2. Update .env.prod (COOKIE_SECRET, COOKIE_SALT for both admin and user web)
# 3. Restart web apps (all users will need to re-login)
docker compose -f deploy/docker-compose.prod.yml restart admin-web user-web
```

### Database Credentials (Rotate Annually)

```bash
# 1. Create new DB user in Atlas
# 2. Update MONGODB_URI in .env.prod
# 3. Restart API
# 4. Delete old DB user after 24 hours
```

---

## Quick Reference

### Service Management

| Action | Command |
|--------|---------|
| Start all | `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d` |
| Stop all | `docker compose -f deploy/docker-compose.prod.yml down` |
| Restart API | `docker compose -f deploy/docker-compose.prod.yml restart api` |
| Restart nginx | `docker compose -f deploy/docker-compose.prod.yml restart nginx` |
| View logs | `docker compose -f deploy/docker-compose.prod.yml logs -f` |
| View API logs | `docker compose -f deploy/docker-compose.prod.yml logs api -f --tail=100` |
| Check status | `docker compose -f deploy/docker-compose.prod.yml ps` |
| Resource usage | `docker stats` |

### Deployment

| Action | Command |
|--------|---------|
| Deploy to staging | `git push origin main` |
| Deploy to production | `git tag v1.x.x && git push origin v1.x.x` |
| Rollback production | `IMAGE_TAG=<prev-version> docker compose up -d` |

### Health Checks

| Check | Command |
|-------|---------|
| API liveness | `curl http://localhost:3001/api/v1/health/liveness` |
| API readiness | `curl http://localhost:3001/api/v1/health/readiness` |
| Redis | `docker exec academyflo-redis redis-cli ping` |
| MongoDB (staging) | `docker exec academyflo-mongo mongosh --eval "rs.status()"` |
| BullMQ email queue | `docker exec academyflo-redis redis-cli llen bull:email:wait` |
| Smoke tests | `API_URL=http://localhost:3001 ADMIN_URL=http://localhost:3002 node scripts/smoke-check.mjs` |

### Database

| Action | Command |
|--------|---------|
| Manual backup | `MONGODB_URI="..." BACKUP_DIR="/backups" bash scripts/backup/mongodump-backup.sh` |
| Restore backup | `MONGODB_URI="..." BACKUP_FILE="..." bash scripts/backup/restore-mongodump.sh --confirm` |
| Mongo shell | `docker exec -it academyflo-mongo mongosh` |

### Redis

| Action | Command |
|--------|---------|
| Memory usage | `docker exec academyflo-redis redis-cli info memory` |
| Client count | `docker exec academyflo-redis redis-cli info clients` |
| Flush cache | `docker exec academyflo-redis redis-cli FLUSHDB` |
| Queue depth | `docker exec academyflo-redis redis-cli llen bull:email:wait` |

---

## Troubleshooting

### API Won't Start

```bash
# Check logs
docker compose -f deploy/docker-compose.prod.yml logs api --tail=50

# Common issues:
# 1. "Cannot connect to MongoDB" → Check MONGODB_URI in .env.prod
# 2. "COOKIE_SECRET must be at least 32 characters" → Regenerate secrets
# 3. "JWT_ACCESS_SECRET must be at least 32 characters" → Regenerate secrets
# 4. "ECONNREFUSED redis://redis:6379" → Check Redis container is healthy
```

### 502 Bad Gateway from Nginx

```bash
# API containers might not be ready yet
docker compose -f deploy/docker-compose.prod.yml ps

# If api shows "starting" or "unhealthy", wait and check again
# If api shows "exited", check logs:
docker compose -f deploy/docker-compose.prod.yml logs api --tail=50
```

### High Memory Usage

```bash
# Check which container is using most memory
docker stats --no-stream

# If API is using >1.8GB, it may be close to OOM
# Restart the service
docker compose -f deploy/docker-compose.prod.yml restart api

# If it keeps happening, increase memory limit in docker-compose
```

### Redis Connection Refused

```bash
# Check Redis container
docker compose -f deploy/docker-compose.prod.yml ps redis
docker compose -f deploy/docker-compose.prod.yml logs redis --tail=20

# If Redis is down, restart it
docker compose -f deploy/docker-compose.prod.yml restart redis

# Note: The app works without Redis (falls back to in-memory cache)
# So Redis being down degrades performance but doesn't cause outage
```

### SSL Certificate Expired

```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew

# Reload nginx
docker exec academyflo-nginx nginx -s reload
```

### Database Connection Issues

```bash
# Test MongoDB connectivity from API container
docker exec academyflo-api-1 wget --quiet --spider http://localhost:3001/api/v1/health/readiness

# If readiness fails, check MongoDB:
# Atlas: Check Atlas dashboard for alerts
# Self-hosted:
docker exec academyflo-mongo mongosh --eval "rs.status()"
```

### Deploy Failed — Images Not Pulling

```bash
# Login to GitHub Container Registry manually
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# Pull images manually
docker pull ghcr.io/<org>/api:latest
docker pull ghcr.io/<org>/admin-web:latest
docker pull ghcr.io/<org>/user-web:latest
```

### Slow Response Times

```bash
# Check API for slow queries
docker compose -f deploy/docker-compose.prod.yml logs api --since=1h | grep "slow query"

# Check Redis cache hit rate
docker exec academyflo-redis redis-cli info stats | grep keyspace

# Check connection pool usage
docker compose -f deploy/docker-compose.prod.yml logs api --since=1h | grep "pool"

# Check if rate limiting is causing 429s
docker compose -f deploy/docker-compose.prod.yml logs nginx --since=1h | grep " 429 "
```
