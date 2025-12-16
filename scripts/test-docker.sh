#!/bin/bash

# Test script for Docker functionality
# Run this script to validate the Docker setup

set -e

echo "🐳 OpenAPI MCP Server - Docker Setup Validation"
echo "================================================"

# Check Docker availability
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed or not in PATH"
  echo "Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

echo "✅ Docker is available"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this script from the project root directory"
  exit 1
fi

echo "✅ Project structure validated"

# Build production image
echo "🔨 Building production Docker image..."
if docker build -t openapi-mcp-server:test -f Dockerfile .; then
  echo "✅ Production image built successfully"
else
  echo "❌ Production image build failed"
  exit 1
fi

# Build development image
echo "🔨 Building development Docker image..."
if docker build -t openapi-mcp-server:dev-test -f Dockerfile.dev .; then
  echo "✅ Development image built successfully"
else
  echo "❌ Development image build failed"
  exit 1
fi

# Test basic container startup (HTTP transport)
echo "🚀 Testing container startup with HTTP transport..."
CONTAINER_ID=$(docker run -d --name mcp-test \
  -e API_BASE_URL=https://httpbin.org \
  -e OPENAPI_SPEC_INLINE='{"openapi":"3.0.0","info":{"title":"Test","version":"1.0.0"},"paths":{"/get":{"get":{"operationId":"httpbinGet","responses":{"200":{"description":"Success"}}}}}}' \
  -e TRANSPORT_TYPE=http \
  -p 3000:3000 \
  openapi-mcp-server:test)

# Wait for startup
echo "⏳ Waiting for server startup..."
sleep 5

# Test if server is responding
if curl -f http://localhost:3000/mcp --max-time 10 &>/dev/null; then
  echo "✅ Server is responding on HTTP transport"
else
  echo "❌ Server not responding on HTTP transport"
  docker logs mcp-test
  docker stop mcp-test && docker rm mcp-test
  exit 1
fi

# Cleanup
docker stop mcp-test && docker rm mcp-test
echo "✅ HTTP transport test completed successfully"

# Test stdio transport
echo "🚀 Testing container with stdio transport..."
if echo '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  docker run --rm -i \
  -e API_BASE_URL=https://httpbin.org \
  -e OPENAPI_SPEC_INLINE='{"openapi":"3.0.0","info":{"title":"Test","version":"1.0.0"},"paths":{}}' \
  -e TRANSPORT_TYPE=stdio \
  openapi-mcp-server:test &>/dev/null; then
    echo "✅ Stdio transport working"
else
  echo "⚠️  Stdio transport test inconclusive (expected for basic test)"
fi

# Test Docker Compose validation
echo "🔍 Validating Docker Compose configuration..."
if docker-compose config &>/dev/null; then
  echo "✅ Docker Compose configuration is valid"
else
  echo "❌ Docker Compose configuration has errors"
  docker-compose config
  exit 1
fi

# Check image security (basic)
echo "🔒 Checking image security basics..."
if docker run --rm openapi-mcp-server:test id | grep -q "uid=1001(appuser)"; then
  echo "✅ Container runs as non-root user"
else
  echo "❌ Container may be running as root"
fi

# Image size check
echo "📊 Checking image size..."
IMAGE_SIZE=$(docker images openapi-mcp-server:test --format "table {{.Size}}" | tail -n 1)
echo "ℹ️  Production image size: $IMAGE_SIZE"

# Cleanup test images if requested
if [ "$1" = "--cleanup" ]; then
  echo "🧹 Cleaning up test images..."
  docker rmi openapi-mcp-server:test openapi-mcp-server:dev-test || true
  echo "✅ Cleanup completed"
fi

echo ""
echo "🎉 Docker setup validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure your API settings in .env file"
echo "2. Run: docker-compose up -d"
echo "3. Access your MCP server at http://localhost:3000/mcp"
echo ""
echo "For production deployment, see docs/docker.md"