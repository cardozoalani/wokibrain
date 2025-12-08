FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
# Install all dependencies first (including dev) to run postinstall
RUN npm ci && npm cache clean --force
# Run postinstall (will skip husky if not available)
RUN npm run postinstall || true
# Then remove dev dependencies
RUN npm prune --production

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Generate WebSocket documentation (ensure files exist even if generation fails)
RUN npm run docs:websockets || (mkdir -p public && touch asyncapi.yaml || true)

FROM base AS runner
ENV NODE_ENV=production
# Install wget for health checks (lighter than curl)
RUN apk add --no-cache wget
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
# Copy all files before switching user
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./
# Copy OpenAPI spec for documentation
COPY --from=builder --chown=appuser:nodejs /app/openapi.yaml ./openapi.yaml
# Copy AsyncAPI spec and public directory (they should exist after docs:websockets)
COPY --from=builder --chown=appuser:nodejs /app/asyncapi.yaml ./asyncapi.yaml
COPY --from=builder --chown=appuser:nodejs /app/public ./public
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]

