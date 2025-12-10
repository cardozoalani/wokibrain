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
# Build application
RUN npm run build
# Generate WebSocket documentation
# Note: Uses the locally installed @asyncapi/cli from devDependencies
# If generation fails (e.g., network issues during build), create placeholder so app doesn't crash
RUN set -e; \
    echo "Generating WebSocket documentation..."; \
    npm run docs:websockets || { \
    echo "⚠️  Warning: WebSocket docs generation failed during build"; \
    mkdir -p public/websockets-docs.html; \
    echo '<!DOCTYPE html><html><head><title>WebSocket Docs - Generation Failed</title></head><body><h1>Documentation generation failed during build</h1><p>Please run: npm run docs:websockets</p></body></html>' > public/websockets-docs.html/index.html; \
    }; \
    test -d public/websockets-docs.html && (test -f public/websockets-docs.html/index.html || test -f public/websockets-docs.html) && echo "✅ WebSocket docs ready" || echo "⚠️  WebSocket docs may be incomplete"

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

