#!/bin/bash

# Docker deployment script for OpenAPI MCP Server
# This script handles deployment to various environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="openapi-mcp-server"
REGISTRY="reallv"
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

# Function to deploy to Docker Compose
deploy_compose() {
  local environment=${1:-production}

  print_status "Deploying to Docker Compose ($environment)..."

  case $environment in
    "development")
      docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
      ;;
    "production")
      docker-compose up -d
      ;;
    "examples")
      docker-compose --profile examples up -d
      ;;
    *)
      print_error "Unknown environment: $environment"
      exit 1
      ;;
  esac

  print_success "Deployment completed. Checking status..."
  docker-compose ps
}

# Function to deploy to Docker Swarm
deploy_swarm() {
  local stack_name=${1:-mcp-stack}

  print_status "Deploying to Docker Swarm (stack: $stack_name)..."

  if [ ! -f "docker-stack.yml" ]; then
    print_error "docker-stack.yml not found. Creating from template..."
    create_swarm_template
  fi

  docker stack deploy -c docker-stack.yml "$stack_name"

  print_success "Swarm deployment completed. Checking services..."
  docker stack services "$stack_name"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
  local namespace=${1:-default}

  print_status "Deploying to Kubernetes (namespace: $namespace)..."

  if [ ! -f "k8s-deployment.yml" ]; then
    print_error "k8s-deployment.yml not found. Creating from template..."
    create_k8s_template
  fi

  if [ "$namespace" != "default" ]; then
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
  fi

  kubectl apply -f k8s-deployment.yml -n "$namespace"

  print_success "Kubernetes deployment completed. Checking pods..."
  kubectl get pods -n "$namespace" -l app=openapi-mcp-server
}

# Function to create Docker Swarm template
create_swarm_template() {
  cat > docker-stack.yml << EOF
version: '3.8'
services:
  openapi-mcp-server:
    image: ${DOCKER_REPO}:${VERSION}
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
      - HTTP_PORT=3000
      - HTTP_HOST=0.0.0.0
    ports:
      - "3000:3000"
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: overlay
EOF
  print_status "Created docker-stack.yml template. Please customize it for your environment."
}

# Function to create Kubernetes template
create_k8s_template() {
  cat > k8s-deployment.yml << EOF
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
        image: ${DOCKER_REPO}:${VERSION}
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
EOF
  print_status "Created k8s-deployment.yml template. Please customize it for your environment."
}

# Function to show deployment status
show_status() {
  local platform=$1

  case $platform in
    "compose")
      print_status "Docker Compose Status:"
      docker-compose ps
      ;;
    "swarm")
      print_status "Docker Swarm Status:"
      docker stack ls
      docker stack services mcp-stack 2>/dev/null || print_warning "No stack named 'mcp-stack' found"
      ;;
    "kubernetes")
      print_status "Kubernetes Status:"
      kubectl get deployments -l app=openapi-mcp-server
      kubectl get pods -l app=openapi-mcp-server
      kubectl get services -l app=openapi-mcp-server
      ;;
    *)
      print_error "Unknown platform: $platform"
      exit 1
      ;;
  esac
}

# Function to cleanup deployments
cleanup() {
  local platform=$1

  case $platform in
    "compose")
      print_status "Cleaning up Docker Compose deployment..."
      docker-compose down -v
      ;;
    "swarm")
      print_status "Cleaning up Docker Swarm deployment..."
      docker stack rm mcp-stack
      ;;
    "kubernetes")
      print_status "Cleaning up Kubernetes deployment..."
      kubectl delete -f k8s-deployment.yml
      ;;
    *)
      print_error "Unknown platform: $platform"
      exit 1
      ;;
  esac
}

# Main deployment process
main() {
  local command=${1:-help}
  local platform=${2:-compose}
  local environment=${3:-production}

  case $command in
    "deploy")
      case $platform in
        "compose")
          deploy_compose "$environment"
          ;;
        "swarm")
          deploy_swarm "$environment"
          ;;
        "kubernetes"|"k8s")
          deploy_kubernetes "$environment"
          ;;
        *)
          print_error "Unknown platform: $platform"
          exit 1
          ;;
      esac
      ;;
    "status")
      show_status "$platform"
      ;;
    "cleanup")
      cleanup "$platform"
      ;;
    "help")
      echo "Usage: $0 COMMAND [PLATFORM] [ENVIRONMENT]"
      echo
      echo "Commands:"
      echo "  deploy     Deploy to specified platform"
      echo "  status     Show deployment status"
      echo "  cleanup    Remove deployment"
      echo "  help       Show this help message"
      echo
      echo "Platforms:"
      echo "  compose    Docker Compose (default)"
      echo "  swarm      Docker Swarm"
      echo "  kubernetes Kubernetes (k8s)"
      echo
      echo "Environments (for compose):"
      echo "  production  Production deployment (default)"
      echo "  development Development deployment"
      echo "  examples    Example APIs deployment"
      echo
      echo "Examples:"
      echo "  $0 deploy compose production"
      echo "  $0 deploy swarm mcp-stack"
      echo "  $0 deploy kubernetes default"
      echo "  $0 status compose"
      echo "  $0 cleanup swarm"
      ;;
    *)
      print_error "Unknown command: $command"
      main help
      exit 1
      ;;
  esac
}

# Run main function
main "$@"