FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Production dependencies only
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Build stage with dev dependencies
FROM base AS builder
COPY package*.json ./
RUN npm ci
# Copy source code (this layer will be cached if only package.json changes)
COPY tsconfig.json ./
COPY src ./src
# Copy only necessary files for build
COPY openapi.yaml asyncapi.yaml ./
# Copy static documentation files
COPY public ./public
# Build application
RUN npm run build
# WebSocket documentation is now a static HTML file (public/websockets-docs.html)
# No generation needed during build

# Final runtime image
FROM base AS runner
ENV NODE_ENV=production
# Install wget for health checks (lighter than curl)
RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
# Copy production dependencies
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
# Copy built application and documentation
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./
COPY --from=builder --chown=appuser:nodejs /app/openapi.yaml ./openapi.yaml
COPY --from=builder --chown=appuser:nodejs /app/asyncapi.yaml ./asyncapi.yaml
COPY --from=builder --chown=appuser:nodejs /app/public ./public
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]

