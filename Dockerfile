# ==========================================================
# PathPilot Enterprise Production Multi-Stage Dockerfile
# Optimized for minimum image size, security hardening, and high concurrency
# ==========================================================

# ----------------------------------------------------------
# Stage 1: Build Frontend Assets
# ----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# Copy application code
COPY . .

# Run production build
RUN npm run build

# ----------------------------------------------------------
# Stage 2: Production API Server & Static Gateway
# ----------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install dumb-init for proper signal handling and zombie reaping
RUN apk add --no-cache dumb-init curl

# Create non-root system user for least-privilege security
RUN addgroup -g 1001 -S pathpilot && \
    adduser -u 1001 -S pathpilot -G pathpilot

# Copy production package dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built frontend assets from builder stage
COPY --from=builder --chown=pathpilot:pathpilot /app/dist ./dist

# Copy backend server code and data
COPY --chown=pathpilot:pathpilot server ./server
COPY --chown=pathpilot:pathpilot pathpilot_roles_with_skills.json ./

# Switch to non-root user
USER pathpilot

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Entrypoint using dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server/index.js"]
