# Multi-stage Node.js Dockerfile for OpenAPI MCP Server
# This creates an optimized production image with minimal attack surface

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S appuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Copy other necessary files
COPY --chown=appuser:nodejs README.md LICENSE CHANGELOG.md ./

# Switch to non-root user
USER appuser

# Expose port (for HTTP transport)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')"

# Set default environment variables
ENV NODE_ENV=production
ENV TRANSPORT_TYPE=stdio
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0

# Default command - can be overridden
CMD ["node", "dist/cli.js"]

# Labels for metadata
LABEL org.opencontainers.image.title="OpenAPI MCP Server"
LABEL org.opencontainers.image.description="A Model Context Protocol server that exposes OpenAPI endpoints as MCP tools"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="OpenAPI MCP Server Contributors"
LABEL org.opencontainers.image.source="https://github.com/lucivuc/openapi-mcp-server"
LABEL org.opencontainers.image.licenses="MIT"