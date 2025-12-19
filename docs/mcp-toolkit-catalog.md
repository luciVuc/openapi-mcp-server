# MCP Toolkit Catalog Integration Guide

This guide explains how the OpenAPI MCP Server integrates with Docker's MCP Toolkit Catalog and how to deploy it in various environments.

## Overview

The OpenAPI MCP Server is designed for seamless integration with the MCP (Model Context Protocol) Toolkit Catalog, providing:

- **Universal API Integration**: Convert any OpenAPI-compliant API into MCP tools
- **Docker-First Deployment**: Production-ready containerized deployment
- **Flexible Configuration**: Environment-based configuration suitable for all deployment scenarios
- **Multi-Transport Support**: Both stdio and HTTP transports for different use cases

## MCP Toolkit Catalog Configuration

The `mcp-server.json` file defines how this server appears in the MCP Toolkit Catalog:

### Key Features for Catalog Integration

```json
{
  "name": "openapi-mcp-server",
  "displayName": "OpenAPI MCP Server",
  "categories": ["API Integration", "Development Tools", "Web Services"],
  "mcpVersion": "2025-03-26",
  "installation": {
    "npm": "@lucid-spark/openapi-mcp-server",
    "docker": {
      "image": "reallv/openapi-mcp-server",
      "tags": ["latest", "1.0.0"]
    }
  }
}
```

### Standard Configuration Schema

All configuration options are documented with JSON Schema:

```json
{
  "configuration": {
    "required": ["apiBaseUrl"],
    "properties": {
      "apiBaseUrl": {
        "type": "string",
        "description": "Base URL for the API endpoints"
      },
      "transportType": {
        "type": "string",
        "enum": ["stdio", "http"],
        "default": "stdio"
      }
    }
  }
}
```

## Deployment Scenarios

### 1. Docker Compose (Recommended)

#### Single API Server

```yaml
version: "3.8"
services:
  openapi-mcp-server:
    image: reallv/openapi-mcp-server:latest
    ports:
      - "3000:3000"
    environment:
      - API_BASE_URL=https://api.example.com
      - OPENAPI_SPEC_PATH=https://api.example.com/openapi.json
      - TRANSPORT_TYPE=http
      - API_HEADERS=Authorization:Bearer ${API_TOKEN}
    restart: unless-stopped
```

#### Multiple API Servers

```yaml
version: "3.8"
services:
  # GitHub API
  github-mcp:
    image: reallv/openapi-mcp-server:latest
    ports: ["3001:3000"]
    environment:
      - API_BASE_URL=https://api.github.com
      - OPENAPI_SPEC_PATH=https://api.github.com/openapi.json
      - API_HEADERS=Authorization:Bearer ${GITHUB_TOKEN}
      - SERVER_NAME=github-mcp-server
      - NAMESPACE=github

  # Petstore API
  petstore-mcp:
    image: reallv/openapi-mcp-server:latest
    ports: ["3002:3000"]
    environment:
      - API_BASE_URL=https://petstore.swagger.io/v2
      - OPENAPI_SPEC_PATH=https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json
      - SERVER_NAME=petstore-mcp-server
      - NAMESPACE=petstore
```

### 2. Kubernetes Deployment

```yaml
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
    spec:
      containers:
        - name: openapi-mcp-server
          image: reallv/openapi-mcp-server:latest
          ports:
            - containerPort: 3000
          env:
            - name: API_BASE_URL
              value: "https://api.example.com"
            - name: OPENAPI_SPEC_PATH
              valueFrom:
                secretKeyRef:
                  name: api-config
                  key: openapi-spec-url
          resources:
            limits:
              memory: "256Mi"
              cpu: "250m"
            requests:
              memory: "128Mi"
              cpu: "100m"
```

### 3. Docker Swarm

```yaml
version: "3.8"
services:
  openapi-mcp-server:
    image: reallv/openapi-mcp-server:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - API_BASE_URL=https://api.example.com
      - TRANSPORT_TYPE=http
    ports:
      - "3000:3000"
```

## Environment Configuration

### Required Environment Variables

```bash
# API Configuration
API_BASE_URL=https://api.example.com
OPENAPI_SPEC_PATH=https://api.example.com/openapi.json

# Transport Configuration
TRANSPORT_TYPE=http  # or stdio
HTTP_PORT=3000
HTTP_HOST=0.0.0.0
```

### Authentication Configuration

```bash
# Static headers (simple APIs)
API_HEADERS="Authorization:Bearer token123,X-API-Key:key456"

# For complex authentication, use the library with custom AuthProvider
```

### Tool Filtering Configuration

```bash
# Control which API endpoints become MCP tools
TOOLS_MODE=all              # all, dynamic, or explicit
INCLUDE_TAGS=public,users   # Filter by OpenAPI tags
INCLUDE_OPERATIONS=GET,POST # Filter by HTTP methods
INCLUDE_RESOURCES=users     # Filter by resource paths
```

## Integration Examples

### Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "API_BASE_URL=https://api.example.com",
        "-e",
        "OPENAPI_SPEC_PATH=https://api.example.com/openapi.json",
        "-e",
        "API_HEADERS=Authorization:Bearer ${API_TOKEN}",
        "reallv/openapi-mcp-server:latest"
      ],
      "env": {
        "API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### MCP Client HTTP Integration

```javascript
// Connect to HTTP transport
const mcpClient = new MCPClient("http://localhost:3000/mcp");

// Initialize session
await mcpClient.initialize({
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "my-client", version: "1.0.0" },
});

// List available tools
const tools = await mcpClient.listTools();

// Execute a tool
const result = await mcpClient.executeTool("get-users", {});
```

## Production Deployment Best Practices

### 1. Security

```yaml
# Use secrets for sensitive data
environment:
  - API_BASE_URL=https://api.example.com
  - OPENAPI_SPEC_PATH_FILE=/run/secrets/openapi_spec_url
secrets:
  - openapi_spec_url
  - api_token

# Run as non-root user (already configured in image)
user: "1001:1001"

# Resource limits
deploy:
  resources:
    limits:
      memory: 256M
      cpus: "0.5"
    reservations:
      memory: 128M
      cpus: "0.25"
```

### 2. Health Checks

```yaml
healthcheck:
  test:
    [
      "CMD",
      "wget",
      "--no-verbose",
      "--tries=1",
      "--spider",
      "http://localhost:3000/mcp",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### 3. Logging and Monitoring

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# Enable debug logging for troubleshooting
environment:
  - DEBUG=true
```

### 4. Scaling

```yaml
# Docker Swarm
deploy:
  replicas: 3
  placement:
    constraints:
      - node.role == worker

# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openapi-mcp-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openapi-mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Troubleshooting

### Common Issues

1. **Container won't start**

   ```bash
   docker logs openapi-mcp-server
   # Check for configuration errors
   ```

2. **API connection fails**

   ```bash
   # Test from container
   docker exec -it openapi-mcp-server curl -I $API_BASE_URL
   ```

3. **OpenAPI spec loading fails**

   ```bash
   # Enable debug mode
   docker run -e DEBUG=true reallv/openapi-mcp-server:latest
   ```

4. **No tools generated**
   ```bash
   # Check spec validity and tool filtering
   docker run -e TOOLS_MODE=dynamic reallv/openapi-mcp-server:latest
   ```

### Performance Optimization

1. **Resource Tuning**

   ```yaml
   # Adjust based on API complexity
   resources:
     limits:
       memory: "512Mi" # For large OpenAPI specs
       cpu: "500m"
   ```

2. **Caching**
   ```yaml
   # Mount cache volume for OpenAPI specs
   volumes:
     - openapi_cache:/app/.cache
   ```

## Support and Documentation

- **Full Documentation**: [Project README](../README.md)
- **Docker Guide**: [Docker Usage Guide](docker.md)
- **API Examples**: [Examples Directory](../examples/)
- **Issues**: [GitHub Issues](https://github.com/lucivuc/openapi-mcp-server/issues)

## Contributing to MCP Toolkit Catalog

To contribute this server to the MCP Toolkit Catalog:

1. Ensure `mcp-server.json` is complete and valid
2. Test all deployment scenarios
3. Verify Docker image security and performance
4. Submit catalog entry following MCP Toolkit guidelines
5. Maintain compatibility with MCP protocol updates

For more information about the MCP Toolkit Catalog, visit the official documentation.
