# OpenAPI MCP Server

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/lucivuc/openapi-mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io/)

A generic Model Context Protocol (MCP) server that dynamically exposes OpenAPI-defined REST APIs as MCP tools. This enables Large Language Models like Claude to discover and interact with any OpenAPI-compliant API through the standardized MCP protocol.

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

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Features](#-features)
- [Installation](#-installation)
- [Configuration](#-configuration)
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
│  Loader             │    │                     │    │   System           │
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

## ✨ Features

### 🔧 Core Capabilities

- **🔄 Dynamic Tool Generation**: Automatically converts OpenAPI operations to MCP tools
- **🔐 Flexible Authentication**: Static headers, dynamic providers, token refresh
- **📊 Advanced Filtering**: Filter tools by tags, resources, operations, or explicit lists
- **🌐 Multiple Transports**: Stdio for Claude Desktop, HTTP for web applications
- **📝 Smart Tool Naming**: Intelligent abbreviation with ≤64 character limit
- **🔍 Meta-Tools**: Built-in API exploration and dynamic endpoint invocation

### 📥 OpenAPI Specification Loading

Support for multiple input methods with robust error handling:

```bash
# URL loading
--openapi-spec https://api.example.com/openapi.json

# Local file
--openapi-spec ./api-spec.yaml

# Standard input (great for CI/CD)
cat openapi.json | openapi-mcp-server --spec-from-stdin --api-base-url https://api.example.com

# Inline specification
--spec-inline '{"openapi":"3.0.0",...}'
```

### 🏷 Tool Management System

#### Three Operating Modes

1. **All Mode (Default)**: Load all tools with optional filtering
2. **Dynamic Mode**: Load only meta-tools for API exploration
3. **Explicit Mode**: Load only specified tools

#### Advanced Filtering

```bash
# Filter by OpenAPI tags
--tag users --tag posts

# Filter by HTTP methods
--operation GET --operation POST

# Filter by resource paths
--resource users --resource /api/v1/posts

# Explicit tool selection
--tools explicit --tool GET::users --tool POST::users
```

### 🔒 Authentication System

#### Static Authentication (Simple)

```typescript
const server = new OpenAPIServer({
  apiBaseUrl: "https://api.example.com",
  headers: {
    Authorization: "Bearer your-token",
    "X-API-Key": "your-key",
  },
});
```

#### Dynamic Authentication (Advanced)

```typescript
class MyAuthProvider implements IAuthProvider {
  async getAuthHeaders() {
    // Called before each request
    return { Authorization: `Bearer ${await this.getValidToken()}` };
  }

  async handleAuthError(error) {
    // Called on 401/403 errors
    await this.refreshToken();
    return true; // Retry request
  }
}
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
  version?: string; // Server version (default: '1.0.0')
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

#### Explicit Tool Selection

```bash
openapi-mcp-server \
  --api-base-url https://api.example.com \
  --openapi-spec ./api-spec.yaml \
  --tools explicit \
  --tool GET::users \
  --tool POST::users \
  --tool GET::posts
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

### Multiple API Servers

```json
{
  "mcpServers": {
    "jsonplaceholder": {
      "command": "npx",
      "args": [
        "@lucid-spark/openapi-mcp-server",
        "openapi-mcp-server",
        "--api-base-url",
        "https://jsonplaceholder.typicode.com",
        "--openapi-spec",
        "https://jsonplaceholder.typicode.com/openapi.json",
        "--tag",
        "posts",
        "--tag",
        "users"
      ]
    },
    "petstore": {
      "command": "npx",
      "args": [
        "@lucid-spark/openapi-mcp-server",
        "openapi-mcp-server",
        "--api-base-url",
        "https://petstore.swagger.io/v2",
        "--openapi-spec",
        "https://petstore.swagger.io/v2/swagger.json",
        "--operation",
        "GET"
      ]
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

### OAuth 2.0 Pattern

```typescript
class OAuth2AuthProvider implements IAuthProvider {
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiry: Date;

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    if (error.response?.status === 401) {
      try {
        await this.refreshAccessToken();
        return true; // Retry the request
      } catch (refreshError) {
        throw new Error("Authentication failed. Please re-authenticate.");
      }
    }
    return false;
  }

  private async refreshAccessToken(): Promise<void> {
    // Implementation depends on your OAuth provider
    const response = await axios.post("https://auth.example.com/oauth/token", {
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
  }

  private isTokenExpired(): boolean {
    return (
      !this.tokenExpiry || this.tokenExpiry <= new Date(Date.now() + 60000)
    );
  }
}
```

## 🛠 Tool Management

### Tool ID System

Tools are identified using a robust ID system that handles complex OpenAPI paths:

- **Format**: `METHOD::pathPart`
- **Path Encoding**: Uses double underscores (`__`) to separate path segments
- **Examples**:
  - `GET::users` → `GET /users`
  - `POST::api__v1__users` → `POST /api/v1/users`
  - `GET::users__123__posts` → `GET /users/123/posts`

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

### Tool Filtering

#### By Tags

```bash
--tag users --tag posts
```

Includes only tools tagged with "users" OR "posts" in the OpenAPI spec.

#### By HTTP Methods

```bash
--operation GET --operation POST
```

Includes only GET and POST operations.

#### By Resource Paths

```bash
--resource users --resource /api/v1/posts
```

Includes tools under specified resource path prefixes.

#### Explicit Tool Selection

```bash
--tools explicit --tool GET::users --tool POST::users
```

Includes only the explicitly specified tools.

## 🌐 Transport Types

### Stdio Transport (Default)

Optimized for Claude Desktop and other MCP clients:

```typescript
const server = new OpenAPIServer({
  // ... config
  transportType: "stdio",
});
```

**Use Cases**:

- Claude Desktop integration
- Command-line MCP clients
- Process-to-process communication

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

**Features**:

- RESTful MCP endpoints
- CORS support
- Session management
- WebSocket upgrade support (planned)

**Endpoints**:

- `GET /mcp` - Server status and capabilities
- `POST /mcp` - MCP JSON-RPC requests
- `DELETE /mcp` - Terminate sessions (if applicable)

## 📚 API Documentation

### TypeScript Interface Exports

```typescript
// Core server
export { OpenAPIServer } from "@lucid-spark/openapi-mcp-server";

// Configuration
export {
  IOpenAPIServerConfig,
  validateConfig,
  DEFAULT_CONFIG,
} from "@lucid-spark/openapi-mcp-server";

// Authentication
export {
  IAuthProvider,
  StaticAuthProvider,
} from "@lucid-spark/openapi-mcp-server";

// Tools
export {
  ITool,
  IToolsFilter,
  ToolsManager,
} from "@lucid-spark/openapi-mcp-server";

// Transport
export {
  ITransportHandler,
  ITransportConfig,
} from "@lucid-spark/openapi-mcp-server";

// Utilities
export {
  generateToolId,
  parseToolId,
  generateToolName,
} from "@lucid-spark/openapi-mcp-server";

// Types
export {
  ToolsMode,
  TransportType,
  SpecInputMethod,
  HttpMethod,
} from "@lucid-spark/openapi-mcp-server";
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

# Run development server
npm run dev:v3
```

### Available Scripts

```bash
# Build TypeScript
npm run build

# Development with Bible API
npm run dev:v2

# Development with Crypto API
npm run dev:v3

# Run MCP Inspector
npm run inspect

# Check dependencies
npm run depcheck

# Run CLI
npm run cli -- --help
```

### Project Structure

```
openapi-mcp-server/
├── src/                           # Source code
│   ├── types/                    # TypeScript interface definitions
│   │   ├── core.ts               # Core type definitions
│   │   ├── config.ts             # Configuration interfaces
│   │   ├── auth.ts               # Authentication interfaces
│   │   ├── api.ts                # API client interfaces
│   │   ├── openapi.ts            # OpenAPI spec interfaces
│   │   ├── tools.ts              # Tool management interfaces
│   │   ├── transport.ts          # Transport interfaces
│   │   └── index.ts              # Type exports
│   ├── core/                     # Core server implementation
│   │   ├── config.ts             # Configuration validation
│   │   ├── server.ts             # Main OpenAPIServer class
│   │   └── index.ts              # Core exports
│   ├── auth/                     # Authentication system
│   │   ├── providers.ts          # StaticAuthProvider implementation
│   │   └── index.ts              # Auth exports
│   ├── api/                      # HTTP client
│   │   ├── client.ts             # ApiClient class
│   │   └── index.ts              # API exports
│   ├── tools/                    # Tool management system
│   │   ├── creation.ts           # Tool creation from OpenAPI
│   │   ├── manager.ts            # ToolsManager class
│   │   ├── utils/               # Tool utilities
│   │   │   ├── id-generator.ts  # Tool ID generation
│   │   │   ├── name-generator.ts # Tool name abbreviation
│   │   │   └── index.ts          # Utility exports
│   │   └── index.ts              # Tools exports
│   ├── transport/                # Transport layer
│   │   ├── base.ts               # Base transport handler
│   │   ├── stdio.ts              # Stdio transport
│   │   ├── http.ts               # HTTP transport
│   │   └── index.ts              # Transport exports
│   ├── openapi/                  # OpenAPI handling
│   │   ├── spec-loader.ts        # OpenAPI spec loader
│   │   └── index.ts              # OpenAPI exports
│   ├── utils/                    # Utility functions
│   │   ├── logger.ts             # Logging utilities
│   │   └── index.ts              # Utils exports
│   ├── cli.ts                    # Command-line interface
│   └── index.ts                  # Library entry point
├── test/                         # Test suite
│   ├── setup.ts                  # Jest configuration
│   ├── types.d.ts                # Test type definitions
│   ├── api/                      # API client tests
│   ├── auth/                     # Authentication tests
│   ├── core/                     # Core server tests
│   ├── openapi/                  # OpenAPI loader tests
│   ├── tools/                    # Tool management tests
│   ├── transport/                # Transport tests
│   └── utils/                    # Utility tests
├── examples/                     # Usage examples
├── docs/                         # Documentation site
├── dist/                         # Compiled JavaScript
├── coverage/                     # Test coverage reports
└── package.json                  # Project configuration
```

### Adding New Features

1. **Define Interfaces**: Add type definitions to `src/types/`
2. **Implement Logic**: Create implementation in appropriate `src/` subdirectory
3. **Export Public API**: Update `src/index.ts` and module index files
4. **Add Tests**: Create test files in matching `test/` structure with `.test.ts` extension
5. **Update Documentation**: Update README and docs/ files

### TypeScript Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
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

### Quick Start with Examples

```bash
# Run the basic JSONPlaceholder example
npx ts-node examples/basic-jsonplaceholder.ts

# Run the HTTP filtering example (starts server on port 3003)
npx ts-node examples/http-filtering.ts

# View CLI usage documentation
npx ts-node examples/cli-usage.ts

# Test dynamic authentication patterns
npx ts-node examples/dynamic-auth.ts
```

### Example Details

#### `basic-jsonplaceholder.ts`

- **Purpose**: Demonstrates inline OpenAPI specification with a public API
- **API**: JSONPlaceholder (fake REST API for testing)
- **Features**: Inline OpenAPI spec, stdio transport, comprehensive tool creation (7 tools)
- **Use Case**: Getting started with simple APIs that don't require authentication

#### `example.ts`

- **Purpose**: Minimal server setup for understanding the basics
- **API**: JSONPlaceholder with custom minimal spec
- **Features**: HTTP transport on port 3001, basic server lifecycle management
- **Use Case**: Learning the core server setup patterns

#### `dynamic-auth.ts`

- **Purpose**: Advanced authentication with token management
- **API**: HTTPBin.org for testing authentication flows
- **Features**: Custom IAuthProvider, token expiration simulation, retry logic
- **Use Case**: APIs requiring authentication tokens that may expire

#### `http-filtering.ts`

- **Purpose**: HTTP transport with comprehensive filtering
- **API**: Swagger Petstore (comprehensive example API)
- **Features**: HTTP server on port 3003, tag/method filtering, real-time statistics
- **Use Case**: Production HTTP deployments with selective tool exposure

#### `cli-usage.ts`

- **Purpose**: Interactive documentation and configuration examples
- **Features**: Colored console output, environment variables, Claude Desktop configs
- **Use Case**: Understanding CLI options and configuration patterns

#### `cli-examples.md`

- **Purpose**: Comprehensive CLI reference documentation
- **Content**: Real API examples, authentication patterns, troubleshooting
- **Use Case**: Copy-paste CLI commands for various scenarios

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

#### 4. Tool Name Issues

**Symptoms**: Tool names are too long or contain invalid characters
**Solutions**:

- Use `--disable-abbreviation` for debugging
- Check OpenAPI `operationId` length and format
- Review tool name generation logs with `--debug`
- Consider custom `operationId` values in your OpenAPI spec

#### 5. Transport Connection Issues

**Symptoms**: Can't connect to HTTP transport or stdio issues
**Solutions**:

- For HTTP: Check port availability: `netstat -an | grep :3000`
- For stdio: Ensure proper process communication setup
- Verify firewall and network connectivity
- Check CORS configuration for web clients

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

### Getting Help

1. **Check Examples**: Review the `examples/` directory for similar use cases
2. **Enable Debug Mode**: Use `--debug` flag for detailed logging
3. **Validate Configuration**: Ensure all required fields are provided
4. **Test API Independently**: Verify API accessibility outside of MCP
5. **Check OpenAPI Spec**: Validate your OpenAPI specification format

### Performance Considerations

- **Large APIs**: Use filtering to reduce tool count
- **Memory Usage**: Monitor memory consumption with many tools
- **Request Rate**: Implement appropriate rate limiting
- **Token Refresh**: Optimize authentication provider performance

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
