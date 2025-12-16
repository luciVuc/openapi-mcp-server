#!/bin/bash

# Docker build script for OpenAPI MCP Server
# This script builds both production and development Docker images

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="openapi-mcp-server"
REGISTRY="lucidspark"
VERSION=$(node -p "require('./package.json').version")
DOCKER_REPO="${REGISTRY}/${IMAGE_NAME}"

# Function to print colored output
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to build image
build_image() {
  local dockerfile=$1
  local tag=$2
  local context=${3:-.}

  print_status "Building $tag using $dockerfile..."

  if docker build -f "$dockerfile" -t "$tag" "$context"; then
    print_success "Successfully built $tag"
  else
    print_error "Failed to build $tag"
    exit 1
  fi
}

# Function to tag image
tag_image() {
  local source=$1
  local target=$2

  print_status "Tagging $source as $target..."

  if docker tag "$source" "$target"; then
    print_success "Successfully tagged $target"
  else
    print_error "Failed to tag $target"
    exit 1
  fi
}

# Function to push image
push_image() {
  local tag=$1

  print_status "Pushing $tag..."

  if docker push "$tag"; then
    print_success "Successfully pushed $tag"
  else
    print_error "Failed to push $tag"
    exit 1
  fi
}

# Main build process
main() {
  print_status "Starting Docker build process for OpenAPI MCP Server v${VERSION}"

  # Ensure we're in the right directory
  if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
  fi

  # Parse command line arguments
  BUILD_PROD=true
  BUILD_DEV=false
  PUSH_IMAGES=false
  BUILD_MULTIARCH=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --dev-only)
        BUILD_PROD=false
        BUILD_DEV=true
        shift
        ;;
      --with-dev)
        BUILD_DEV=true
        shift
        ;;
      --push)
        PUSH_IMAGES=true
        shift
        ;;
      --multiarch)
        BUILD_MULTIARCH=true
        shift
        ;;
      --help)
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --dev-only     Build only development image"
        echo "  --with-dev     Build both production and development images"
        echo "  --push         Push images to registry"
        echo "  --multiarch    Build multi-architecture images"
        echo "  --help         Show this help message"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        exit 1
        ;;
    esac
  done

  # Build production image
  if [ "$BUILD_PROD" = true ]; then
    if [ "$BUILD_MULTIARCH" = true ]; then
      print_status "Building multi-architecture production image..."
      docker buildx build --platform linux/amd64,linux/arm64 \
        -t "${IMAGE_NAME}:latest" \
        -t "${IMAGE_NAME}:${VERSION}" \
        -t "${DOCKER_REPO}:latest" \
        -t "${DOCKER_REPO}:${VERSION}" \
        .
    else
      build_image "Dockerfile" "${IMAGE_NAME}:latest"
      tag_image "${IMAGE_NAME}:latest" "${IMAGE_NAME}:${VERSION}"
      tag_image "${IMAGE_NAME}:latest" "${DOCKER_REPO}:latest"
      tag_image "${IMAGE_NAME}:latest" "${DOCKER_REPO}:${VERSION}"
    fi
  fi

  # Build development image
  if [ "$BUILD_DEV" = true ]; then
    build_image "Dockerfile.dev" "${IMAGE_NAME}:dev"
    tag_image "${IMAGE_NAME}:dev" "${DOCKER_REPO}:dev"
  fi

  # Push images if requested
  if [ "$PUSH_IMAGES" = true ]; then
    if [ "$BUILD_PROD" = true ]; then
      push_image "${DOCKER_REPO}:latest"
      push_image "${DOCKER_REPO}:${VERSION}"
    fi

    if [ "$BUILD_DEV" = true ]; then
      push_image "${DOCKER_REPO}:dev"
    fi
  fi

  # Show build summary
  print_success "Build process completed!"
  echo
  print_status "Built images:"

  if [ "$BUILD_PROD" = true ]; then
    echo "  - ${IMAGE_NAME}:latest"
    echo "  - ${IMAGE_NAME}:${VERSION}"
    echo "  - ${DOCKER_REPO}:latest"
    echo "  - ${DOCKER_REPO}:${VERSION}"
  fi

  if [ "$BUILD_DEV" = true ]; then
    echo "  - ${IMAGE_NAME}:dev"
    echo "  - ${DOCKER_REPO}:dev"
  fi

  echo
  print_status "Usage examples:"
  echo "  # Run with HTTP transport:"
  echo "  docker run --rm -p 3000:3000 -e API_BASE_URL=https://api.example.com -e OPENAPI_SPEC_PATH=https://api.example.com/openapi.json -e TRANSPORT_TYPE=http ${IMAGE_NAME}:latest"
  echo
  echo "  # Run with stdio transport:"
  echo "  docker run --rm -i -e API_BASE_URL=https://api.example.com -e OPENAPI_SPEC_PATH=https://api.example.com/openapi.json ${IMAGE_NAME}:latest"
  echo
  print_status "For more examples, see docs/docker.md"
}

# Run main function
main "$@"