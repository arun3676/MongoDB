# ===========================================
# VIGIL - Production Dockerfile
# Multi-stage build for optimized image size
# ===========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove unnecessary files before build
RUN rm -rf \
    *.pkl \
    *.csv \
    generate_synthetic_data.py \
    import_csv_to_mongodb.py \
    train_isolation_forest.py \
    pnpm-lock.yaml \
    .git \
    .claude

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application (standalone output enabled on Linux)
RUN npm run build

# Ensure public directory exists (create if missing, with a placeholder to ensure COPY works)
RUN mkdir -p /app/public && touch /app/public/.gitkeep

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets (directory exists in builder with at least .gitkeep)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build (created on Linux builds)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Set default port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application (standalone mode)
CMD ["node", "server.js"]
