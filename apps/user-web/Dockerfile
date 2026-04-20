# =============================================================================
# Academyflo User Web — Multi-stage Dockerfile
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
COPY apps/user-web/package.json ./apps/user-web/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm ci --ignore-scripts

# Copy sources after deps so a source change doesn't bust the install layer
COPY packages/ ./packages/
COPY apps/user-web/ ./apps/user-web/

RUN npm run build --workspace=@academyflo/user-web

# ---------------------------------------------------------------------------
# Stage 2: Minimal runtime image (Next.js standalone output + static assets)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

WORKDIR /app

COPY --from=builder /repo/apps/user-web/.next/standalone ./
COPY --from=builder /repo/apps/user-web/.next/static ./apps/user-web/.next/static
COPY --from=builder /repo/apps/user-web/public ./apps/user-web/public

ENV NODE_ENV=production
ENV TZ=Asia/Kolkata
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/ || exit 1

CMD ["node", "apps/user-web/server.js"]
