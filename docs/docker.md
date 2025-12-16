# Docker Usage Guide

This guide covers how to use the OpenAPI MCP Server with Docker, including building images, running containers, and deploying to production.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Images](#docker-images)
- [Configuration](#configuration)
- [Docker Compose](#docker-compose)
- [Production Deployment](#production-deployment)
- [Development Setup](#development-setup)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using Pre-built Image (Recommended)

```bash
# Pull the latest image
docker pull lucidspark/openapi-mcp-server:latest

# Run with HTTP transport
docker run --rm -p 3000:3000 \
  -e API_BASE_URL=https://petstore.swagger.io/v2 \
  -e OPENAPI_SPEC_PATH=https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json \
  -e TRANSPORT_TYPE=http \
  lucidspark/openapi-mcp-server:latest

# Run with stdio transport (for MCP clients)
docker run --rm -i \
  -e API_BASE_URL=https://api.example.com \
  -e OPENAPI_SPEC_PATH=https://api.example.com/openapi.json \
  lucidspark/openapi-mcp-server:latest
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/lucivuc/openapi-mcp-server.git
cd openapi-mcp-server

# Build the image
npm run docker:build

# Run the built image
npm run docker:run
```

## Docker Images

### Production Image (`Dockerfile`)

- **Base**: `node:18-alpine`
- **Size**: ~150MB (optimized)
- **User**: Non-root (`appuser`)
- **Features**: Multi-stage build, security optimized

### Development Image (`Dockerfile.dev`)

- **Base**: `node:18-alpine`
- **Size**: ~300MB (includes dev dependencies)
- **Features**: Hot reloading, debugging support

## Configuration

### Environment Variables

All configuration options can be set via environment variables:

```bash
# Required
API_BASE_URL=https://api.example.com
OPENAPI_SPEC_PATH=https://api.example.com/openapi.json

# Authentication
API_HEADERS="Authorization:Bearer token,X-API-Key:key"

# Transport
TRANSPORT_TYPE=http  # or stdio
HTTP_PORT=3000
HTTP_HOST=0.0.0.0

# Tool filtering
TOOLS_MODE=all  # all, dynamic, or explicit
INCLUDE_TAGS=public,users
INCLUDE_OPERATIONS=GET,POST

# Debug
DEBUG=true
```

### Configuration File

Create a `.env` file based on `docker-env-example.txt`:

```bash
cp docker-env-example.txt .env
# Edit .env with your configuration
```

### Volume Mounts

```bash
# Mount local OpenAPI specs
docker run --rm -p 3000:3000 \
  -v $(pwd)/specs:/app/specs:ro \
  -e OPENAPI_SPEC_PATH=/app/specs/api.yaml \
  openapi-mcp-server

# Mount configuration
docker run --rm -p 3000:3000 \
  -v $(pwd)/.env:/app/.env:ro \
  openapi-mcp-server
```

## Docker Compose

### Basic Setup

```bash
# Start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

### Multiple API Servers

```bash
# Start example servers (Petstore, JSONPlaceholder)
docker-compose --profile examples up -d

# Access different APIs:
# - Main server: http://localhost:3000/mcp
# - Petstore: http://localhost:3001/mcp
# - JSONPlaceholder: http://localhost:3002/mcp
```

### Development Mode

```bash
# Start in development mode with hot reloading
npm run docker:compose:dev
```

### With Nginx Proxy

```bash
# Start with reverse proxy
docker-compose --profile proxy up -d

# Access via proxy:
# - Main: http://localhost/mcp
# - Petstore: http://localhost/petstore
```

## Production Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: "3.8"
services:
  openapi-mcp-server:
    image: lucidspark/openapi-mcp-server:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - API_BASE_URL=https://api.example.com
      - OPENAPI_SPEC_PATH=https://api.example.com/openapi.json
      - TRANSPORT_TYPE=http
    ports:
      - "3000:3000"
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: overlay
```

```bash
# Deploy to swarm
docker stack deploy -c docker-stack.yml mcp-stack
```

### Kubernetes

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openapi-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openapi-mcp-server
  template:
    metadata:
      labels:
        app: openapi-mcp-server
    spec:
      containers:
        - name: openapi-mcp-server
          image: lucidspark/openapi-mcp-server:latest
          ports:
            - containerPort: 3000
          env:
            - name: API_BASE_URL
              value: "https://api.example.com"
            - name: OPENAPI_SPEC_PATH
              value: "https://api.example.com/openapi.json"
            - name: TRANSPORT_TYPE
              value: "http"
          resources:
            limits:
              memory: "256Mi"
              cpu: "250m"
            requests:
              memory: "128Mi"
              cpu: "100m"
          readinessProbe:
            httpGet:
              path: /mcp
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /mcp
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: openapi-mcp-server-service
spec:
  selector:
    app: openapi-mcp-server
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

```bash
# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yml
```

## Development Setup

### Local Development with Docker

```bash
# Build development image
npm run docker:build:dev

# Run development container
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Connect to container for debugging
docker-compose exec openapi-mcp-server /bin/sh
```

### Debugging

```bash
# Run with Node.js debugging enabled
docker run --rm -p 3000:3000 -p 9229:9229 \
  -e NODE_OPTIONS="--inspect=0.0.0.0:9229" \
  openapi-mcp-server:dev

# Connect your IDE debugger to localhost:9229
```

### Testing

```bash
# Run tests in container
npm run docker:test

# Run specific test suite
docker run --rm openapi-mcp-server npm run test:coverage
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose logs openapi-mcp-server

# Verify configuration
docker run --rm openapi-mcp-server node -e "console.log(process.env)"
```

#### 2. API Connection Issues

```bash
# Test API connectivity from container
docker run --rm openapi-mcp-server curl -I $API_BASE_URL

# Check OpenAPI spec loading
docker run --rm -e DEBUG=true openapi-mcp-server
```

#### 3. Permission Issues

```bash
# Check if running as non-root user
docker run --rm openapi-mcp-server id

# Fix file permissions
sudo chown -R $(id -u):$(id -g) ./specs
```

#### 4. Network Connectivity

```bash
# Test network connectivity
docker network ls
docker network inspect mcp-network

# Debug container networking
docker run --rm --network mcp-network alpine ping openapi-mcp-server
```

### Performance Optimization

#### Resource Limits

```yaml
# docker-compose.yml
services:
  openapi-mcp-server:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
        reservations:
          cpus: "0.25"
          memory: 128M
```

#### Multi-arch Builds

```bash
# Build for multiple architectures
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t openapi-mcp-server .
```

### Health Checks

```bash
# Check container health
docker ps
docker inspect openapi-mcp-server | grep Health

# Manual health check
curl -f http://localhost:3000/mcp || exit 1
```

### Monitoring

```bash
# Monitor resource usage
docker stats openapi-mcp-server

# Export logs
docker logs openapi-mcp-server > mcp-server.log 2>&1
```

## Security Considerations

1. **Non-root User**: Container runs as `appuser` (uid 1001)
2. **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
3. **No Sensitive Data**: Never include API keys in the image
4. **Network Security**: Use Docker networks for service communication
5. **Resource Limits**: Set appropriate CPU and memory limits
6. **Regular Updates**: Keep base images and dependencies updated

## Best Practices

1. **Use Environment Variables**: Never hardcode secrets in images
2. **Multi-stage Builds**: Separate build and runtime environments
3. **Health Checks**: Implement proper health check endpoints
4. **Logging**: Use structured logging for better observability
5. **Graceful Shutdown**: Handle SIGTERM for clean container stops
6. **Version Tags**: Use specific version tags, not `latest` in production

## Examples

See the `examples/` directory for complete Docker usage examples:

- `docker-examples/`: Various Docker configurations
- `k8s-examples/`: Kubernetes deployment examples
- `production/`: Production-ready configurations

For more examples and patterns, visit the [project repository](https://github.com/lucivuc/openapi-mcp-server).
