# OpenAPI MCP Server

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/lucivuc/openapi-mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io/)

A generic Model Context Protocol (MCP) server that dynamically exposes OpenAPI-defined REST APIs as MCP tools. This enables Large Language Models like Claude to discover and interact with any OpenAPI-compliant API through the standardized MCP protocol.

## ✨ Key Features

- **🔄 Dynamic Tool Generation**: Automatically converts OpenAPI operations to MCP tools
- **🔐 Flexible Authentication**: Static headers, dynamic providers, token refresh
- **📊 Advanced Filtering**: Filter tools by tags, resources, operations, or explicit lists
- **🌐 Multiple Transports**: Stdio for Claude Desktop, HTTP for web applications
- **📝 Smart Tool Naming**: Intelligent abbreviation with ≤64 character limit
- **� Meta-Tools**: Built-in API exploration and dynamic endpoint invocation
- **🏗 Interface-Based Architecture**: Type-safe, modular design with comprehensive interfaces
- **📥 Multiple Input Methods**: URL, file, stdin, or inline OpenAPI specifications

## 🚀 Quick Start

### CLI Usage (Recommended)

```bash
# Install globally
npm install -g @lucid-spark/openapi-mcp-server

# Use with any OpenAPI-compliant API
openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --transport stdio
```

### Docker Usage (Production Ready)

```bash
# Run with HTTP transport
docker run --rm -p 3000:3000 \
  -e API_BASE_URL=https://petstore.swagger.io/v2 \
  -e OPENAPI_SPEC_PATH=https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json \
  -e TRANSPORT_TYPE=http \
  reallv/openapi-mcp-server:latest

# Run with stdio transport (for Claude Desktop)
docker run --rm -i \
  -e API_BASE_URL=https://api.example.com \
  -e OPENAPI_SPEC_PATH=https://api.example.com/openapi.json \
  reallv/openapi-mcp-server:latest

# Use docker-compose for multiple APIs
docker-compose up -d
```

### Library Usage

```bash
npm install @lucid-spark/openapi-mcp-server
```

```typescript
import { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

const server = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "https://api.example.com/openapi.json",
  transportType: "stdio",
});

await server.start();
```

## 📖 Documentation

- **[Complete Documentation](#-table-of-contents)** - Comprehensive guide with examples and patterns
- **[Library Usage](#library-usage)** - For developers creating custom MCP servers using this package
- **[Developer Guide](./docs/developer-guide.md)** - For contributors and developers working on the codebase
- **[Examples Directory](./examples/README.md)** - Practical usage examples and patterns

For MCP protocol details, see [modelcontextprotocol.io](https://modelcontextprotocol.io/docs/getting-started/intro).

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Docker Usage](#-docker-usage)
- [Usage Examples](#-usage-examples)
- [Claude Desktop Integration](#-claude-desktop-integration)
- [Authentication](#-authentication)
- [Tool Management](#-tool-management)
- [Transport Types](#-transport-types)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)

## 🏗 Architecture

The OpenAPI MCP Server uses a modular, interface-based architecture for maximum flexibility and type safety:

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   OpenAPI Server    │    │    Configuration    │    │    Type System      │
│                     │    │                     │    │                     │
│ • Orchestration     │◄──►│ • Validation        │◄──►│ • Interface-based   │
│ • MCP Protocol      │    │ • Defaults          │    │ • Type Safety       │
│ • Lifecycle Mgmt    │    │ • Environment Vars  │    │ • Extensibility     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  OpenAPI Spec       │    │   Tools Manager     │    │   Authentication    │
│  Loader             │    │                     │    │   System            │
│                     │    │ • Tool Creation     │    │                     │
│ • Multiple Inputs   │    │ • Filtering         │    │ • Static Headers    │
│ • $ref Resolution   │    │ • Lookup & Cache    │    │ • Dynamic Providers │
│ • Schema Processing │    │ • Meta-tools        │    │ • Token Refresh     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    Tool System      │    │    API Client       │    │   Transport Layer   │
│                     │    │                     │    │                     │
│ • ID Generation     │    │ • HTTP Requests     │    │ • Stdio (Claude)    │
│ • Name Abbreviation │    │ • Auth Integration  │    │ • HTTP (Web Apps)   │
│ • Schema Mapping    │    │ • Error Handling    │    │ • Session Mgmt      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Key Components

1. **Type System (`types/`)**: Interface definitions ensuring type safety and modularity
2. **Configuration System**: Validates settings, applies defaults, supports environment variables
3. **OpenAPI Spec Loader**: Handles multiple input methods with $ref resolution
4. **Tools Manager**: Creates and filters MCP tools from OpenAPI operations
5. **Authentication System**: Supports static headers and dynamic authentication providers
6. **API Client**: Executes authenticated HTTP requests with retry logic
7. **Transport Layer**: Stdio for Claude Desktop, HTTP for web applications
8. **Tool Utilities**: ID generation, name abbreviation, schema processing

---

# User Guide

This section covers how to use the MCP server as an end user with Claude Desktop, Cursor, or other MCP-compatible tools.

## Overview

This MCP server can be used in two ways:

1. **CLI Tool**: Use `npx @lucid-spark/openapi-mcp-server openapi-mcp-server` directly with command-line arguments for quick setup
2. **Library**: Import and use the `OpenAPIServer` class in your own Node.js applications for custom implementations

The server supports two transport methods:

1. **Stdio Transport** (default): For direct integration with AI systems like Claude Desktop that manage MCP connections through standard input/output.
2. **HTTP Transport**: For connecting to the server over HTTP, allowing web clients and other HTTP-capable systems to use the MCP protocol.

## Quick Start for Users

### Option 1: Using with Claude Desktop (Stdio Transport)

No need to clone this repository. Simply configure Claude Desktop to use this MCP server:

1. Locate or create your Claude Desktop configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the following configuration:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "npx",
      "args": ["-y", "@lucid-spark/openapi-mcp-server", "openapi-mcp-server"],
      "env": {
        "API_BASE_URL": "https://api.example.com",
        "OPENAPI_SPEC_PATH": "https://api.example.com/openapi.json",
        "API_HEADERS": "Authorization:Bearer token123,X-API-Key:your-api-key"
      }
    }
  }
}
```

3. Replace the environment variables with your actual API configuration:
   - `API_BASE_URL`: The base URL of your API
   - `OPENAPI_SPEC_PATH`: URL or path to your OpenAPI specification
   - `API_HEADERS`: Comma-separated key:value pairs for API authentication headers

### Option 2: Using with HTTP Clients (HTTP Transport)

To use the server with HTTP clients:

1. No installation required! Use npx to run the package directly:

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --headers "Authorization:Bearer token123" \
  --transport http \
  --port 3000
```

2. Interact with the server using HTTP requests:

```bash
# Initialize a session (first request)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl-client","version":"1.0.0"}}}'

# The response includes a Mcp-Session-Id header that you must use for subsequent requests
# and the InitializeResult directly in the POST response body.

# Send a request to list tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: your-session-id" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Open a streaming connection for other server responses (e.g., tool execution results)
# This uses Server-Sent Events (SSE).
curl -N http://localhost:3000/mcp -H "Mcp-Session-Id: your-session-id"

# Example: Execute a tool (response will arrive on the GET stream)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: your-session-id" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/execute","params":{"name":"yourToolName", "arguments": {}}}'

# Terminate the session when done
curl -X DELETE http://localhost:3000/mcp -H "Mcp-Session-Id: your-session-id"
```

## 📦 Installation

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **TypeScript**: 5.3.0 or higher (for development)

### Global Installation (CLI)

```bash
npm install -g @lucid-spark/openapi-mcp-server
```

### Local Installation (Library)

```bash
npm install @lucid-spark/openapi-mcp-server
```

### Development Installation

```bash
git clone https://github.com/lucivuc/openapi-mcp-server.git
cd openapi-mcp-server
npm install
npm run build
```

## 🐳 Docker Usage

### Quick Start with Docker

The easiest way to run the OpenAPI MCP Server is with Docker. No local Node.js installation required!

```bash
# Pull the latest image
docker pull reallv/openapi-mcp-server:latest

# Run with Petstore API example
docker run --rm -p 3000:3000 \
  -e API_BASE_URL=https://petstore.swagger.io/v2 \
  -e OPENAPI_SPEC_PATH=https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json \
  -e TRANSPORT_TYPE=http \
  reallv/openapi-mcp-server:latest
```

### Docker Compose (Recommended)

For production deployments and multiple API servers:

```bash
# Clone and configure
git clone https://github.com/lucivuc/openapi-mcp-server.git
cd openapi-mcp-server
cp docker-env-example.txt .env
# Edit .env with your API configuration

# Start the server
docker-compose up -d

# Start with example APIs
docker-compose --profile examples up -d

# View logs
docker-compose logs -f
```

### MCP Toolkit Catalog Integration

This server is designed for inclusion in Docker's MCP Toolkit Catalog. The `mcp-server.json` file provides:

- **Standardized Configuration**: Complete schema for all options
- **Usage Examples**: Ready-to-use configurations for common APIs
- **Docker Integration**: Pre-built images and compose files
- **Multiple Transport Support**: Both stdio and HTTP transports
- **Production Ready**: Security hardened, non-root containers

### Environment Configuration

Configure via environment variables (perfect for Docker):

```bash
# Required
API_BASE_URL=https://api.example.com
OPENAPI_SPEC_PATH=https://api.example.com/openapi.json

# Authentication
API_HEADERS="Authorization:Bearer token,X-API-Key:key"

# Transport
TRANSPORT_TYPE=http
HTTP_PORT=3000
HTTP_HOST=0.0.0.0

# Tool filtering
TOOLS_MODE=all
INCLUDE_TAGS=public,users
INCLUDE_OPERATIONS=GET,POST
```

See [Docker Usage Guide](docs/docker.md) for complete documentation, deployment patterns, and production best practices.

## ⚙️ Configuration

### Complete Configuration Interface

```typescript
interface IOpenAPIServerConfig {
  // Required
  apiBaseUrl: string; // Base URL for API endpoints

  // OpenAPI Specification
  openApiSpec?: string; // Path, URL, or inline content
  specInputMethod?: SpecInputMethod; // 'url' | 'file' | 'stdin' | 'inline'

  // Server Identity
  name?: string; // Server name (default: 'openapi-mcp-server')
  version?: string; // Server version (default: '1.0.2')
  namespace?: string; // Namespace for the MCP server tools

  // Authentication (choose one)
  headers?: Record<string, string>; // Static headers
  authProvider?: IAuthProvider; // Dynamic authentication

  // Transport
  transportType?: TransportType; // 'stdio' | 'http' (default: 'stdio')
  httpPort?: number; // HTTP port (default: 3000)
  httpHost?: string; // HTTP host (default: '127.0.0.1')
  endpointPath?: string; // HTTP endpoint (default: '/mcp')

  // Tool Management
  toolsMode?: ToolsMode; // 'all' | 'dynamic' | 'explicit'
  includeTools?: string[]; // Specific tools to include
  includeTags?: string[]; // OpenAPI tags to include
  includeResources?: string[]; // Resource paths to include
  includeOperations?: string[]; // HTTP methods to include

  // Options
  disableAbbreviation?: boolean; // Disable tool name abbreviation
  debug?: boolean; // Enable debug logging
}
```

### Environment Variables

All configuration options can be set via environment variables:

```bash
# Required
export API_BASE_URL="https://api.example.com"

# OpenAPI Spec
export OPENAPI_SPEC_PATH="./api-spec.yaml"
export OPENAPI_SPEC_FROM_STDIN="true"
export OPENAPI_SPEC_INLINE='{"openapi":"3.0.0",...}'

# Authentication
export API_HEADERS="Authorization:Bearer token,X-API-Key:key"

# Server
export SERVER_NAME="my-api-server"
export SERVER_VERSION="2.0.0"
export NAMESPACE="my-namespace"

# Transport
export TRANSPORT_TYPE="http"
export HTTP_PORT="8080"
export HTTP_HOST="0.0.0.0"
export ENDPOINT_PATH="/mcp"

# Tool Management
export TOOLS_MODE="all"
export DISABLE_ABBREVIATION="true"
```

### Command Line Arguments

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --headers "Authorization:Bearer token123,X-API-Key:your-api-key" \
  --name "my-mcp-server" \
  --server-version "1.0.0" \
  --transport http \
  --port 3000 \
  --host 127.0.0.1 \
  --path /mcp \
  --disable-abbreviation true
```

## 🎯 Usage Examples

### Basic Examples

#### Public API (No Authentication)

```bash
openapi-mcp-server \
  --api-base-url https://jsonplaceholder.typicode.com \
  --openapi-spec https://jsonplaceholder.typicode.com/openapi.json
```

#### API with Authentication

```bash
openapi-mcp-server \
  --api-base-url https://api.github.com \
  --openapi-spec https://api.github.com/openapi.json \
  --headers "Authorization:Bearer ghp_xxxxxxxxxxxx,Accept:application/vnd.github.v3+json"
```

#### Local API Development

```bash
openapi-mcp-server \
  --api-base-url http://localhost:8080 \
  --openapi-spec ./local-api-spec.yaml \
  --debug
```

### Advanced Examples

#### Filtered API Subset

```bash
openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --tag public \
  --operation GET \
  --operation POST \
  --resource users
```

#### HTTP Transport for Web Apps

```bash
openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec ./api-spec.yaml \
  --transport http \
  --port 3000 \
  --host 0.0.0.0
```

#### Dynamic Meta-Tools Only

```bash
openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec ./api-spec.yaml \
  --tools dynamic
```

## 🖥 Claude Desktop Integration

### Basic Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": [
        "@lucid-spark/openapi-mcp-server",
        "openapi-mcp-server",
        "--api-base-url",
        "https://api.example.com",
        "--openapi-spec",
        "https://api.example.com/openapi.json"
      ]
    }
  }
}
```

### With Authentication

```json
{
  "mcpServers": {
    "github-api": {
      "command": "npx",
      "args": [
        "@lucid-spark/openapi-mcp-server",
        "openapi-mcp-server",
        "--api-base-url",
        "https://api.github.com",
        "--openapi-spec",
        "https://api.github.com/openapi.json",
        "--headers",
        "Authorization:Bearer ${GITHUB_TOKEN},Accept:application/vnd.github.v3+json"
      ],
      "env": {
        "GITHUB_TOKEN": "your-github-token-here"
      }
    }
  }
}
```

## 🔐 Authentication

### Static Headers (Simple)

Perfect for APIs with long-lived tokens or API keys:

```typescript
const server = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  headers: {
    Authorization: "Bearer your-long-lived-token",
    "X-API-Key": "your-api-key",
    Accept: "application/json",
  },
});
```

### Dynamic Authentication (Advanced)

Ideal for APIs with short-lived tokens that need refresh:

```typescript
class GitHubAuthProvider implements IAuthProvider {
  private accessToken: string;
  private tokenExpiry: Date;

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.isTokenExpired()) {
      throw new Error("Token expired. Please authenticate again.");
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "OpenAPI-MCP-Server",
    };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    if (error.response?.status === 401) {
      // GitHub tokens don't refresh automatically
      // In a real implementation, you might redirect to OAuth flow
      throw new Error(
        "GitHub authentication failed. Please update your token.",
      );
    }
    return false;
  }

  private isTokenExpired(): boolean {
    return !this.tokenExpiry || this.tokenExpiry <= new Date();
  }
}
```

## 🛠 Tool Management

### Tool ID System

Tools are identified using a robust ID system that handles complex OpenAPI paths:

- **Format**: `METHOD::pathPart`
- **Path Encoding**: Uses double underscores (`__`) to separate path segments and triple dashes (`---`) to indicate path parameters
- **Examples**:
  - `GET::users` → `GET /users`
  - `POST::api__v1__users` → `POST /api/v1/users`
  - `GET::users__123__posts` → `GET /users/123/posts`
  - `GET::users__---userId---` → `GET /users/{userId}`
  - `PUT::api__v1__users__---id---__profile` → `PUT /api/v1/users/{id}/profile`

### Tool Name Generation

Tool names are automatically generated with intelligent abbreviation:

- **Length Limit**: ≤64 characters
- **Format**: `[a-z0-9-]+`
- **Smart Abbreviation**: Removes common words, applies standard abbreviations
- **Examples**:
  - `getUserDetails` → `get-user-details`
  - `ServiceUsersManagementController_updateUser` → `svc-usrs-mgmt-upd-usr-a1b2`

### Meta-Tools

The server provides three built-in meta-tools for dynamic API exploration:

#### 1. `list-api-endpoints`

Lists all available API endpoints with optional filtering:

```json
{
  "name": "list-api-endpoints",
  "arguments": {
    "tag": "users",
    "method": "GET"
  }
}
```

#### 2. `get-api-endpoint-schema`

Gets detailed schema information for a specific endpoint:

```json
{
  "name": "get-api-endpoint-schema",
  "arguments": {
    "toolId": "GET::users__123"
  }
}
```

#### 3. `invoke-api-endpoint`

Directly invokes any API endpoint:

```json
{
  "name": "invoke-api-endpoint",
  "arguments": {
    "toolId": "POST::users",
    "parameters": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

## 🌐 Transport Types

### Stdio Transport (Default)

Optimized for Claude Desktop and other MCP clients:

```typescript
const server = new OpenAPIServer({
  // ... config
  transportType: "stdio",
});
```

### HTTP Transport

Enables web-based MCP clients:

```typescript
const server = new OpenAPIServer({
  // ... config
  transportType: "http",
  httpPort: 3000,
  httpHost: "0.0.0.0",
  endpointPath: "/mcp",
});
```

---

# Library Usage

This section covers how to use the package as a library in your own applications.

## Installation

Install the package in your project:

```bash
npm install @lucid-spark/openapi-mcp-server
```

## Basic Usage

```typescript
import { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

const server = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "https://api.example.com/openapi.json",
  transportType: "stdio",
});

await server.start();
```

## Advanced Configuration

```typescript
import {
  OpenAPIServer,
  IOpenAPIServerConfig,
  IAuthProvider,
  validateConfig,
} from "@lucid-spark/openapi-mcp-server";

// Custom authentication provider
class CustomAuthProvider implements IAuthProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${await this.getValidToken()}`,
      "X-Custom-Header": "custom-value",
    };
  }

  async handleAuthError(error: any): Promise<boolean> {
    // Handle authentication errors
    if (error.response?.status === 401) {
      await this.refreshToken();
      return true; // Retry request
    }
    return false;
  }

  private async getValidToken(): Promise<string> {
    // Implementation depends on your auth system
    return "your-token";
  }

  private async refreshToken(): Promise<void> {
    // Refresh token logic
  }
}

// Complete server configuration
const config: IOpenAPIServerConfig = {
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "./api-spec.yaml",
  specInputMethod: "file",
  name: "my-custom-server",
  version: "2.0.0",
  namespace: "my-api",
  authProvider: new CustomAuthProvider(),
  transportType: "http",
  httpPort: 8080,
  httpHost: "0.0.0.0",
  endpointPath: "/mcp",
  toolsMode: "all",
  includeTags: ["users", "posts"],
  includeOperations: ["GET", "POST"],
  disableAbbreviation: false,
  debug: true,
};

// Validate configuration before use
const validatedConfig = validateConfig(config);

// Create and start server
const server = new OpenAPIServer(validatedConfig);
await server.start();

// Get server statistics
const stats = server.getStats();
console.log(`Server running with ${stats.toolCount} tools`);

// Test connection
const isConnected = await server.testConnection();
console.log(`API connection: ${isConnected ? "OK" : "Failed"}`);

// Stop server when done
await server.stop();
```

## Custom Tool Filtering

```typescript
import { OpenAPIServer, ToolsManager } from "@lucid-spark/openapi-mcp-server";

// Example: Only include tools for user management
const server = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "./api-spec.yaml",
  toolsMode: "explicit",
  includeTools: [
    "GET::users",
    "POST::users",
    "GET::users__123",
    "PUT::users__123",
    "DELETE::users__123",
  ],
});
```

## Integration Examples

### Express.js Integration

```typescript
import express from "express";
import { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

const app = express();
const mcpServer = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "./api-spec.yaml",
  transportType: "http",
  httpPort: 3001, // Different port from Express
  httpHost: "127.0.0.1",
});

// Start MCP server alongside Express
app.listen(3000, async () => {
  console.log("Express server running on port 3000");
  await mcpServer.start();
  console.log("MCP server running on port 3001");
});
```

### CLI Tool Integration

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { OpenAPIServer, validateConfig } from "@lucid-spark/openapi-mcp-server";

const program = new Command();

program
  .name("my-mcp-tool")
  .description("Custom MCP server for My API")
  .requiredOption("--token <token>", "API authentication token")
  .option("--port <port>", "HTTP port", "3000")
  .action(async (options) => {
    const config = validateConfig({
      apiBaseUrl: "https://my-api.com",
      openApiSpec: "https://my-api.com/openapi.json",
      headers: {
        Authorization: `Bearer ${options.token}`,
      },
      transportType: "http",
      httpPort: parseInt(options.port),
    });

    const server = new OpenAPIServer(config);
    await server.start();

    console.log(`MCP server running on port ${options.port}`);

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down...");
      await server.stop();
      process.exit(0);
    });
  });

program.parse();
```

## Error Handling

```typescript
import { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

try {
  const server = new OpenAPIServer({
    apiBaseUrl: "https://api.example.com",
    openApiSpec: "invalid-spec.json",
  });

  await server.start();
} catch (error) {
  if (error.message.includes("OpenAPI specification")) {
    console.error("Failed to load OpenAPI spec:", error.message);
  } else if (error.message.includes("API connection")) {
    console.error("Failed to connect to API:", error.message);
  } else {
    console.error("Server startup failed:", error.message);
  }
}
```

## TypeScript Support

The package includes comprehensive TypeScript definitions:

```typescript
import {
  OpenAPIServer,
  IOpenAPIServerConfig,
  IAuthProvider,
  ITool,
  IToolsFilter,
  ToolsMode,
  TransportType,
  SpecInputMethod,
  HttpMethod,
  validateConfig,
  generateToolId,
  parseToolId,
  generateToolName,
  DEFAULT_CONFIG,
} from "@lucid-spark/openapi-mcp-server";

// All types are fully typed for excellent IDE support
```

## 📚 API Documentation

### TypeScript Interface Exports

```typescript
// Core server
export { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

// Configuration
export {
  validateConfig,
  DEFAULT_CONFIG,
} from "@lucid-spark/openapi-mcp-server";

// Authentication
export {
  StaticAuthProvider,
  isAuthError,
} from "@lucid-spark/openapi-mcp-server";

// OpenAPI specification handling
export { OpenAPISpecLoader } from "@lucid-spark/openapi-mcp-server";

// Tool creation and management
export {
  createToolFromOperation,
  createMetaTools,
} from "@lucid-spark/openapi-mcp-server";
export { ToolsManager } from "@lucid-spark/openapi-mcp-server";

// HTTP client
export { ApiClient } from "@lucid-spark/openapi-mcp-server";

// Tool utilities
export {
  generateToolId,
  parseToolId,
  sanitizeForToolId,
  extractResourceName,
  isValidToolId,
  isValidHttpMethod,
  HTTP_METHODS,
  generateToolName,
  isValidToolName,
} from "@lucid-spark/openapi-mcp-server";

// Transport layer
export {
  BaseTransportHandler,
  StdioTransportHandler,
  HttpTransportHandler,
  createTransportHandler,
} from "@lucid-spark/openapi-mcp-server";

// Logging utilities
export { Logger, logger, setDebugMode } from "@lucid-spark/openapi-mcp-server";

// MCP SDK types
export type { Tool } from "@modelcontextprotocol/sdk/types.js";

// All interface definitions from types directory
export * from "@lucid-spark/openapi-mcp-server";
```

### Core Methods

#### OpenAPIServer

```typescript
class OpenAPIServer {
  constructor(config: IOpenAPIServerConfig);

  async start(): Promise<void>;
  async stop(): Promise<void>;

  getStats(): ServerStats;
  async testConnection(): Promise<boolean>;
}
```

#### Configuration

```typescript
function validateConfig(config: IOpenAPIServerConfig): IOpenAPIServerConfig;

const DEFAULT_CONFIG: Partial<IOpenAPIServerConfig>;
```

#### Authentication

```typescript
interface IAuthProvider {
  getAuthHeaders(): Promise<Record<string, string>>;
  handleAuthError(error: AxiosError): Promise<boolean>;
}

class StaticAuthProvider implements IAuthProvider {
  constructor(headers: Record<string, string>);
}
```

## 🧪 Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/lucivuc/openapi-mcp-server.git
cd openapi-mcp-server

# Install dependencies
npm install

# Build project
npm run build

# Run development server with CryptoMkt API
npm run dev:cryptomkt
```

### Available Scripts

```bash
# Build TypeScript
npm run build

# Development with different APIs
npm run dev:bible          # Bible API with authentication
npm run dev:cryptomkt      # CryptoMkt API
npm run dev:petstore:v2:json   # Petstore API v2.0 JSON
npm run dev:petstore:v2:yaml   # Petstore API v2.0 YAML
npm run dev:petstore:v3:json   # Petstore API v3.0 JSON
npm run dev:petstore:v3:yaml   # Petstore API v3.0 YAML
npm run dev:petstore:v3.1:json # Petstore API v3.1 JSON
npm run dev:petstore:v3.1:yaml # Petstore API v3.1 YAML

# Run MCP Inspector with different APIs
npm run inspect:bible
npm run inspect:cryptomkt
npm run inspect:petstore:v2:json
npm run inspect:petstore:v2:yaml
npm run inspect:petstore:v3:json
npm run inspect:petstore:v3:yaml
npm run inspect:petstore:v3.1:json
npm run inspect:petstore:v3.1:yaml

# Testing
npm run test              # Run tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
npm run test:verbose      # Run tests with verbose output

# Code quality
npm run format            # Format code with Prettier
npm run format:staged     # Format staged files

# Development tools
npm run cli -- --help     # Run CLI with help
npm run depcheck          # Check for unused dependencies
npm start                 # Start built server
```

### Project Structure

```
openapi-mcp-server/
├── src/                     # Source code
│   ├── types/              # TypeScript interface definitions
│   │   ├── core.ts         # Core type definitions
│   │   ├── config.ts       # Configuration interfaces
│   │   ├── auth.ts         # Authentication interfaces
│   │   ├── api.ts          # API client interfaces
│   │   ├── openapi.ts      # OpenAPI specification interfaces
│   │   ├── tools.ts        # Tool management interfaces
│   │   ├── transport.ts    # Transport interfaces
│   │   └── index.ts        # Type exports
│   ├── core/               # Core server implementation
│   │   ├── config.ts       # Configuration validation and defaults
│   │   ├── server.ts       # Main OpenAPI MCP Server class
│   │   └── index.ts        # Core exports
│   ├── auth/               # Authentication providers
│   │   ├── providers.ts    # Static auth provider and utilities
│   │   └── index.ts        # Auth exports
│   ├── api/                # HTTP client
│   │   ├── client.ts       # ApiClient implementation
│   │   └── index.ts        # API exports
│   ├── tools/              # Tool management system
│   │   ├── creation.ts     # Tool creation from OpenAPI operations
│   │   ├── manager.ts      # ToolsManager for filtering and caching
│   │   ├── utils/          # Tool utilities (ID generation, etc.)
│   │   └── index.ts        # Tools exports
│   ├── transport/          # Transport implementations
│   │   ├── base.ts         # Base transport handler and factory
│   │   ├── stdio.ts        # Stdio transport for Claude Desktop
│   │   ├── http.ts         # HTTP transport for web applications
│   │   └── index.ts        # Transport exports
│   ├── openapi/            # OpenAPI specification handling
│   │   ├── spec-loader.ts  # OpenAPISpecLoader with multiple input methods
│   │   └── index.ts        # OpenAPI exports
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Logging system with debug support
│   │   └── index.ts        # Utils exports
│   ├── cli.ts              # Command-line interface
│   └── index.ts            # Library entry point
├── examples/               # Usage examples
├── docs/                   # Documentation website
├── test/                   # Test files
├── coverage/               # Test coverage reports
├── dist/                   # Compiled JavaScript
└── package.json           # Project configuration
```

## 📁 Examples

The `examples/` directory contains comprehensive usage examples:

- **`basic-jsonplaceholder.ts`**: Simple JSONPlaceholder API with inline OpenAPI spec, stdio transport, debug logging
- **`example.ts`**: Minimal HTTP server example demonstrating basic server setup and startup lifecycle
- **`dynamic-auth.ts`**: Advanced authentication with custom IAuthProvider, token refresh, and error handling using httpbin.org
- **`http-filtering.ts`**: HTTP transport with Petstore API, comprehensive filtering by tags/methods, server statistics
- **`cli-usage.ts`**: Interactive CLI documentation with colored output, environment variables, and Claude Desktop configs
- **`cli-examples.md`**: Complete CLI usage reference with real API examples, authentication patterns, and troubleshooting

See individual example files for detailed implementation patterns and the CLI examples markdown for comprehensive usage documentation.

See the [Examples README](./examples/README.md) for detailed documentation.

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAPI Spec Loading Fails

**Symptoms**: Error loading specification from URL/file
**Solutions**:

- Verify URL accessibility: `curl -I https://api.example.com/openapi.json`
- Check file permissions: `ls -la ./api-spec.yaml`
- Validate JSON/YAML syntax: `json_verify < spec.json`
- Use `--debug` flag for detailed error information

#### 2. No Tools Generated

**Symptoms**: Server starts but no tools are available
**Solutions**:

- Ensure OpenAPI spec has valid `paths` section
- Check filtering criteria (tags, operations, resources)
- Verify `operationId` or `summary` fields exist
- Use `--tools dynamic` to always have meta-tools available

#### 3. Authentication Errors

**Symptoms**: 401/403 responses from API
**Solutions**:

- Validate API credentials independently: `curl -H "Authorization: Bearer token" https://api.example.com/test`
- Check token expiration and format
- Verify header names and values
- Implement proper error handling in `IAuthProvider`

### Debug Mode

Enable comprehensive logging:

```bash
openapi-mcp-server --debug --api-base-url https://api.example.com --openapi-spec ./spec.yaml
```

Debug output includes:

- Configuration validation details
- OpenAPI spec loading progress
- Tool creation and filtering steps
- Authentication header application
- API request/response details
- Transport layer operations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [OpenAPI Initiative](https://www.openapis.org/) - The OpenAPI specification
- [Anthropic](https://www.anthropic.com/) - Claude Desktop integration
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development

---

**Made with ❤️ for the MCP ecosystem**

````

3. Replace the environment variables with your actual API configuration:
   - `API_BASE_URL`: The base URL of your API
   - `OPENAPI_SPEC_PATH`: URL or path to your OpenAPI specification
   - `API_HEADERS`: Comma-separated key:value pairs for API authentication headers

### Option 2: Using with HTTP Clients (HTTP Transport)

To use the server with HTTP clients:

1. No installation required! Use npx to run the package directly:

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --headers "Authorization:Bearer token123" \
  --transport http \
  --port 3000
````

2. Interact with the server using HTTP requests:

```bash
# Initialize a session (first request)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl-client","version":"1.0.0"}}}'

# The response includes a Mcp-Session-Id header that you must use for subsequent requests
# and the InitializeResult directly in the POST response body.

# Send a request to list tools
# This also receives its response directly on this POST request.
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: your-session-id" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Open a streaming connection for other server responses (e.g., tool execution results)
# This uses Server-Sent Events (SSE).
curl -N http://localhost:3000/mcp -H "Mcp-Session-Id: your-session-id"

# Example: Execute a tool (response will arrive on the GET stream)
# curl -X POST http://localhost:3000/mcp \
#  -H "Content-Type: application/json" \
#  -H "Mcp-Session-Id: your-session-id" \
#  -d '{"jsonrpc":"2.0","id":2,"method":"tools/execute","params":{"name":"yourToolName", "arguments": {}}}'

# Terminate the session when done
curl -X DELETE http://localhost:3000/mcp -H "Mcp-Session-Id: your-session-id"
```

## Configuration Options

The server can be configured through environment variables or command line arguments:

### Environment Variables

- `API_BASE_URL` - Base URL for the API endpoints
- `OPENAPI_SPEC_PATH` - Path or URL to OpenAPI specification
- `OPENAPI_SPEC_FROM_STDIN` - Set to "true" to read OpenAPI spec from standard input
- `OPENAPI_SPEC_INLINE` - Provide OpenAPI spec content directly as a string
- `API_HEADERS` - Comma-separated key:value pairs for API headers
- `SERVER_NAME` - Name for the MCP server (default: "openapi-mcp-server")
- `SERVER_VERSION` - Version of the server (default: "1.0.2")
- `TRANSPORT_TYPE` - Transport type to use: "stdio" or "http" (default: "stdio")
- `HTTP_PORT` - Port for HTTP transport (default: 3000)
- `HTTP_HOST` - Host for HTTP transport (default: "127.0.0.1")
- `ENDPOINT_PATH` - Endpoint path for HTTP transport (default: "/mcp")
- `TOOLS_MODE` - Tools loading mode: "all" (load all endpoint-based tools), "dynamic" (load only meta-tools), or "explicit" (load only tools specified in includeTools) (default: "all")
- `DISABLE_ABBREVIATION` - Disable name optimization (this could throw errors when name is > 64 chars)

### Command Line Arguments

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --headers "Authorization:Bearer token123,X-API-Key:your-api-key" \
  --name "my-mcp-server" \
  --server-version "1.0.0" \
  --transport http \
  --port 3000 \
  --host 127.0.0.1 \
  --path /mcp \
  --disable-abbreviation true
```

## OpenAPI Specification Loading

The MCP server supports multiple methods for loading OpenAPI specifications, providing flexibility for different deployment scenarios:

### 1. URL Loading (Default)

Load the OpenAPI spec from a remote URL:

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json
```

### 2. Local File Loading

Load the OpenAPI spec from a local file:

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec ./path/to/openapi.yaml
```

### 3. Standard Input Loading

Read the OpenAPI spec from standard input (useful for piping or containerized environments):

```bash
# Pipe from file
cat openapi.json | npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --spec-from-stdin

# Pipe from curl
curl -s https://api.example.com/openapi.json | npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --spec-from-stdin

# Using environment variable
export OPENAPI_SPEC_FROM_STDIN=true
echo '{"openapi": "3.0.0", ...}' | npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com
```

### 4. Inline Specification

Provide the OpenAPI spec content directly as a command line argument:

```bash
npx @lucid-spark/openapi-mcp-server openapi-mcp-server \
  --api-base-url https://api.example.com \
  --spec-inline '{"openapi": "3.0.0", "info": {"title": "My API", "version": "1.0.0"}, "paths": {}}'

# Using environment variable
export OPENAPI_SPEC_INLINE='{"openapi": "3.0.0", ...}'
npx @lucid-spark/openapi-mcp-server openapi-mcp-server --api-base-url https://api.example.com
```

### Supported Formats

All loading methods support both JSON and YAML formats. The server automatically detects the format and parses accordingly.

### Docker and Container Usage

For containerized deployments, you can mount OpenAPI specs or use stdin:

```bash
# Mount local file
docker run -v /path/to/spec:/app/spec.json your-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec /app/spec.json

# Use stdin with docker
cat openapi.json | docker run -i your-mcp-server \
  --api-base-url https://api.example.com \
  --spec-from-stdin
```

### Error Handling

The server provides detailed error messages for spec loading failures:

- **URL loading**: HTTP status codes and network errors
- **File loading**: File system errors (not found, permissions, etc.)
- **Stdin loading**: Empty input or read errors
- **Inline loading**: Missing content errors
- **Parsing errors**: Detailed JSON/YAML syntax error messages

### Validation

Only one specification source can be used at a time. The server will validate that exactly one of the following is provided:

- `--openapi-spec` (URL or file path)
- `--spec-from-stdin`
- `--spec-inline`

If multiple sources are specified, the server will exit with an error message.

## Tool Loading & Filtering Options

Based on the Stainless article "What We Learned Converting Complex OpenAPI Specs to MCP Servers" (https://www.stainless.com/blog/what-we-learned-converting-complex-openapi-specs-to-mcp-servers), the following flags were added to control which API endpoints (tools) are loaded:

- `--tools <all|dynamic|explicit>`: Choose tool loading mode:
  - `all` (default): Load all tools from the OpenAPI spec, applying any specified filters
  - `dynamic`: Load only dynamic meta-tools (`list-api-endpoints`, `get-api-endpoint-schema`, `invoke-api-endpoint`)
  - `explicit`: Load only tools explicitly listed in `--tool` options, ignoring all other filters
- `--tool <toolId>`: Import only specified tool IDs or names. Can be used multiple times.
- `--tag <tag>`: Import only tools with the specified OpenAPI tag. Can be used multiple times.
- `--resource <resource>`: Import only tools under the specified resource path prefixes. Can be used multiple times.
- `--operation <method>`: Import only tools for the specified HTTP methods (get, post, etc). Can be used multiple times.

**Examples:**

```bash
# Load only dynamic meta-tools
npx @lucid-spark/openapi-mcp-server openapi-mcp-server
  --api-base-url https://api.example.com
  --openapi-spec https://api.example.com/openapi.json
  --tools dynamic

# Load only explicitly specified tools (ignores other filters)
npx @lucid-spark/openapi-mcp-server openapi-mcp-server
  --api-base-url https://api.example.com
  --openapi-spec https://api.example.com/openapi.json
  --tools explicit
  --tool GET::users
  --tool POST::users

# Load only the GET /users endpoint tool (using all mode with filtering)
npx @lucid-spark/openapi-mcp-server openapi-mcp-server
  --api-base-url https://api.example.com
  --openapi-spec https://api.example.com/openapi.json
  --tool GET-users

# Load tools tagged with "user" under the "/users" resource
npx @lucid-spark/openapi-mcp-server openapi-mcp-server
  --api-base-url https://api.example.com
  --openapi-spec https://api.example.com/openapi.json
  --tag user
  --resource users

# Load only POST operations
npx @lucid-spark/openapi-mcp-server openapi-mcp-server
  --api-base-url https://api.example.com
  --openapi-spec https://api.example.com/openapi.json
  --operation post
```

## Transport Types

### Stdio Transport (Default)

The stdio transport is designed for direct integration with AI systems like Claude Desktop that manage MCP connections through standard input/output. This is the simplest setup and requires no network configuration.

**When to use**: When integrating with Claude Desktop or other systems that support stdio-based MCP communication.

### Streamable HTTP Transport

The HTTP transport allows the MCP server to be accessed over HTTP, enabling web applications and other HTTP-capable clients to interact with the MCP protocol. It supports session management, streaming responses, and standard HTTP methods.

**Key features**:

- Session management with Mcp-Session-Id header
- HTTP responses for `initialize` and `tools/list` requests are sent synchronously on the POST.
- Other server-to-client messages (e.g., `tools/execute` results, notifications) are streamed over a GET connection using Server-Sent Events (SSE).
- Support for POST/GET/DELETE methods

**When to use**: When you need to expose the MCP server to web clients or systems that communicate over HTTP rather than stdio.

## Security Considerations

- The HTTP transport validates Origin headers to prevent DNS rebinding attacks
- By default, HTTP transport only binds to localhost (127.0.0.1)
- If exposing to other hosts, consider implementing additional authentication

## Debugging

To see debug logs:

1. When using stdio transport with Claude Desktop:
   - Logs appear in the Claude Desktop logs

2. When using HTTP transport:
   ```bash
   npx @lucid-spark/openapi-mcp-server openapi-mcp-server --transport http &2>debug.log
   ```

---

# Library Usage

This section is for developers who want to use this package as a library to create custom MCP servers.

## 🚀 Using as a Library

Create dedicated MCP servers for specific APIs by importing and configuring the `OpenAPIServer` class. This approach is ideal for:

- **Custom Authentication**: Implement complex authentication patterns with the `AuthProvider` interface
- **API-Specific Optimizations**: Filter endpoints, customize error handling, and optimize for specific use cases
- **Distribution**: Package your server as a standalone npm module for easy sharing
- **Integration**: Embed the server in larger applications or add custom middleware

### Basic Library Usage

```typescript
import { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const config = {
  name: "my-api-server",
  version: "1.0.0",
  apiBaseUrl: "https://api.example.com",
  openApiSpec: "https://api.example.com/openapi.json",
  specInputMethod: "url" as const,
  headers: {
    Authorization: "Bearer your-token",
    "X-API-Key": "your-api-key",
  },
  transportType: "stdio" as const,
  toolsMode: "all" as const, // Options: "all", "dynamic", "explicit"
};

const server = new OpenAPIServer(config);
const transport = new StdioServerTransport();
await server.start(transport);
```

### Tool Loading Modes

The `toolsMode` configuration option controls which tools are loaded from your OpenAPI specification:

```typescript
// Load all tools from the spec (default)
const config = {
  // ... other config
  toolsMode: "all" as const,
  // Optional: Apply filters to control which tools are loaded
  includeTools: ["GET::users", "POST::users"], // Only these tools
  includeTags: ["public"], // Only tools with these tags
  includeResources: ["users"], // Only tools under these resources
  includeOperations: ["get", "post"], // Only these HTTP methods
};

// Load only dynamic meta-tools for API exploration
const config = {
  // ... other config
  toolsMode: "dynamic" as const,
  // Provides: list-api-endpoints, get-api-endpoint-schema, invoke-api-endpoint
};

// Load only explicitly specified tools (ignores other filters)
const config = {
  // ... other config
  toolsMode: "explicit" as const,
  includeTools: ["GET::users", "POST::users"], // Only these exact tools
  // includeTags, includeResources, includeOperations are ignored in explicit mode
};
```

### Advanced Authentication with AuthProvider

For APIs with token expiration, refresh requirements, or complex authentication:

```typescript
import { OpenAPIServer, IAuthProvider } from "@lucid-spark/openapi-mcp-server";
import { AxiosError } from "axios";

class MyAuthProvider implements IAuthProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    // Called before each request - return fresh headers
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    // Called on 401/403 errors - return true to retry
    if (error.response?.status === 401) {
      await this.refreshToken();
      return true; // Retry the request
    }
    return false;
  }
}

const authProvider = new MyAuthProvider();
const config = {
  // ... other config
  authProvider: authProvider, // Use AuthProvider instead of static headers
};
```

**📁 See the [examples/](./examples/) directory for complete, runnable examples including:**

- Basic library usage with static authentication
- AuthProvider implementations for different scenarios
- Real-world Beatport API integration
- generic packaging patterns

## 🔐 Dynamic Authentication with AuthProvider

The `AuthProvider` interface enables sophisticated authentication scenarios that static headers cannot handle:

### Key Features

- **Dynamic Headers**: Fresh authentication headers for each request
- **Token Expiration Handling**: Automatic detection and handling of expired tokens
- **Authentication Error Recovery**: Retry logic for recoverable authentication failures
- **Custom Error Messages**: Provide clear, actionable guidance to users

### AuthProvider Interface

```typescript
interface AuthProvider {
  /**
   * Get authentication headers for the current request
   * Called before each API request to get fresh headers
   */
  getAuthHeaders(): Promise<Record<string, string>>;

  /**
   * Handle authentication errors from API responses
   * Called when the API returns 401 or 403 errors
   * Return true to retry the request, false otherwise
   */
  handleAuthError(error: AxiosError): Promise<boolean>;
}
```

### Common Patterns

#### Automatic Token Refresh

```typescript
class RefreshableAuthProvider implements AuthProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    if (error.response?.status === 401) {
      await this.refreshToken();
      return true; // Retry with fresh token
    }
    return false;
  }
}
```

#### Manual Token Management (e.g., Beatport)

```typescript
class ManualTokenAuthProvider implements AuthProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.token || this.isTokenExpired()) {
      throw new Error(
        "Token expired. Please get a new token from your browser:\n" +
          "1. Go to the API website and log in\n" +
          "2. Open browser dev tools (F12)\n" +
          "3. Copy the Authorization header from any API request\n" +
          "4. Update your token using updateToken()",
      );
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  updateToken(token: string): void {
    this.token = token;
    this.tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
  }
}
```

#### API Key Authentication

```typescript
class ApiKeyAuthProvider implements AuthProvider {
  constructor(private apiKey: string) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    return { "X-API-Key": this.apiKey };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    throw new Error("API key authentication failed. Please check your key.");
  }
}
```

**📖 For detailed authentication patterns and examples, see the [examples/](./examples/) directory**

### OpenAPI Schema Processing

#### Reference Resolution

This MCP server implements robust OpenAPI reference (`$ref`) resolution to ensure accurate representation of API schemas:

- **Parameter References**: Fully resolves `$ref` pointers to parameter components in the OpenAPI spec
- **Schema References**: Handles nested schema references within parameters and request bodies
- **Recursive References**: Prevents infinite loops by detecting and handling circular references
- **Nested Properties**: Preserves complex nested object and array structures with all their attributes

### Input Schema Composition

The server intelligently merges parameters and request bodies into a unified input schema for each tool:

- **Parameters + Request Body Merging**: Combines path, query, and body parameters into a single schema
- **Collision Handling**: Resolves naming conflicts by prefixing body properties that conflict with parameter names
- **Type Preservation**: Maintains the original type information for all schema elements
- **Metadata Retention**: Preserves descriptions, formats, defaults, enums, and other schema attributes

### Complex Schema Support

The MCP server handles various OpenAPI schema complexities:

- **Primitive Type Bodies**: Wraps non-object request bodies in a "body" property
- **Object Bodies**: Flattens object properties into the tool's input schema
- **Array Bodies**: Properly handles array schemas with their nested item definitions
- **Required Properties**: Tracks and preserves which parameters and properties are required

---

# Developer Information

## For Developers

### Development Tools

- `npm run build` - Builds the TypeScript source
- `npm run test` - Runs the test suite with Jest
- `npm run test:watch` - Runs tests in watch mode
- `npm run test:coverage` - Runs tests with coverage reporting
- `npm run format` - Formats code with Prettier
- `npm run format:staged` - Formats staged files only
- `npm run dev:cryptomkt` - Runs development server with CryptoMkt API
- `npm run inspect:cryptomkt` - Runs MCP Inspector with CryptoMkt API

### Development Workflow

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development environment: `npm run dev:cryptomkt` or `npm run inspect:cryptomkt`
4. Make changes to the TypeScript files in `src/`
5. Run tests: `npm run test`
6. Format code: `npm run format`

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Format code: `npm run format`
6. Submit a pull request

**📖 For comprehensive developer documentation and contribution guidelines, see [docs/developer-guide.md](./docs/developer-guide.md)**

---

# FAQ

**Q: What is a "tool"?**
A: A tool corresponds to a single API endpoint derived from your OpenAPI specification, exposed as an MCP resource.

**Q: How can I use this package in my own project?**
A: You can import the `OpenAPIServer` class and use it as a library in your Node.js application. This allows you to create dedicated MCP servers for specific APIs with custom authentication, filtering, and error handling. See the [examples/](./examples/) directory for complete implementations.

**Q: What's the difference between using the CLI and using it as a library?**
A: The CLI is great for quick setup and testing, while the library approach allows you to create dedicated packages for specific APIs, implement custom authentication with `AuthProvider`, add custom logic, and distribute your server as a standalone npm module.

**Q: How do I handle APIs with expiring tokens?**
A: Use the `AuthProvider` interface instead of static headers. AuthProvider allows you to implement dynamic authentication with token refresh, expiration handling, and custom error recovery. See the AuthProvider examples for different patterns.

**Q: What is AuthProvider and when should I use it?**
A: `AuthProvider` is an interface for dynamic authentication that gets fresh headers before each request and handles authentication errors. Use it when your API has expiring tokens, requires token refresh, or needs complex authentication logic that static headers can't handle.

**Q: How do I filter which tools are loaded?**
A: Use the `--tool`, `--tag`, `--resource`, and `--operation` flags with `--tools all` (default), set `--tools dynamic` for meta-tools only, or use `--tools explicit` to load only tools specified with `--tool` (ignoring other filters).

**Q: When should I use dynamic mode?**
A: Dynamic mode provides meta-tools (`list-api-endpoints`, `get-api-endpoint-schema`, `invoke-api-endpoint`) to inspect and interact with endpoints without preloading all operations, which is useful for large or changing APIs.

**Q: How do I specify custom headers for API requests?**
A: Use the `--headers` flag or `API_HEADERS` environment variable with `key:value` pairs separated by commas for CLI usage. For library usage, use the `headers` config option or implement an `AuthProvider` for dynamic headers.

**Q: Which transport methods are supported?**
A: The server supports stdio transport (default) for integration with AI systems and HTTP transport (with streaming via SSE) for web clients.

**Q: How does the server handle complex OpenAPI schemas with references?**
A: The server fully resolves `$ref` references in parameters and schemas, preserving nested structures, default values, and other attributes. See the "OpenAPI Schema Processing" section for details on reference resolution and schema composition.

**Q: What happens when parameter names conflict with request body properties?**
A: The server detects naming conflicts and automatically prefixes body property names with `body_` to avoid collisions, ensuring all properties are accessible.

**Q: Can I package my MCP server for distribution?**
A: Yes! When using the library approach, you can create a dedicated npm package for your API. See the Beatport example for a complete implementation that can be packaged and distributed as `npx your-api-mcp-server`.

**Q: Where can I find development and contribution guidelines?**
A: See the [Developer Guide](./docs/developer-guide.md) for comprehensive documentation on architecture, key concepts, development workflow, and contribution guidelines.

## License

MIT
