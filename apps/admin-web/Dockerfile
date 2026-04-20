# =============================================================================
# Academyflo Admin Web — Multi-stage Dockerfile
# Base image: Node 20 LTS (pinned major)
# Build context: repository root (monorepo)
# Requires output: 'standalone' in next.config.ts
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies + build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /repo

# Copy workspace manifests and lockfile first (cache-friendly layer)
COPY package.json package-lock.json ./
COPY apps/admin-web/package.json ./apps/admin-web/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/contracts/package.json ./packages/contracts/

# Install ALL deps (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy shared packages (needed for build resolution)
COPY packages/ ./packages/

# Copy admin-web source
COPY apps/admin-web/ ./apps/admin-web/

# Build the Next.js application (standalone output)
RUN npm run build --workspace=@academyflo/admin-web

# ---------------------------------------------------------------------------
# Stage 2: Production runner (minimal, secure)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Security: do not run as root
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy standalone output from builder
COPY --from=builder /repo/apps/admin-web/.next/standalone ./
COPY --from=builder /repo/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /repo/apps/admin-web/public ./apps/admin-web/public

# Set environment
ENV NODE_ENV=production
ENV TZ=Asia/Kolkata
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

# Switch to non-root user
USER appuser

EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/ || exit 1

# Start the standalone server
CMD ["node", "apps/admin-web/server.js"]
