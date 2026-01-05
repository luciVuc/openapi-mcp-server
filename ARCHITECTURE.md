# OpenAPI MCP Server - Architecture & Code Flow Documentation

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenAPI MCP Server                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   CLI / Library Entry                    │  │
│  │          (cli.ts / index.ts)                             │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │            Configuration System                          │  │
│  │  - Validation (config.ts)                               │  │
│  │  - Environment variables                                │  │
│  │  - Default values                                       │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                           │
│  ┌──────────────────▼───────────────────────────────────────┐  │
│  │         OpenAPI MCP Server (Core)                        │  │
│  │          - Orchestration                                │  │
│  │          - MCP Protocol Handlers                        │  │
│  │          - Tool Execution                               │  │
│  └────┬──────┬──────────┬──────────┬──────────┬──────┬─────┘  │
│       │      │          │          │          │      │         │
│   ┌───▼──┐┌──▼─┐┌──────▼──┐┌─────▼─┐┌─────┬──▼──┐┌──▼───┐   │
│   │Spec  ││Tool││Auth     ││API    ││Trans││Utils││Logger│   │
│   │Loader││Mgr ││System   ││Client ││port ││     │└──────┘   │
│   └──────┘└────┘└─────────┘└───────┘└─────┘└─────┘           │
│      │        │       │          │       │                     │
│   ┌──▼─┐  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐ ┌──▼──┐                 │
│   │YAML│  │Name │  │Static│  │Axios│ │Stdio│                 │
│   │JSON│  │Gen  │  │Dyn   │  │HTTP │ │HTTP │                 │
│   └────┘  └─────┘  └──────┘  └─────┘ └─────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### 1. **Initialization Flow**

```
User/System
    │
    ├─ Provide Config (CLI args, env vars, or code)
    │
    ▼
OpenAPIServer Constructor
    │
    ├─ validateConfig()
    ├─ Create AuthProvider
    └─ Setup MCP handlers
    │
    ▼
OpenAPIServer.start()
    │
    ├─ OpenAPISpecLoader.loadSpec()
    │  ├─ Determine input method (url/file/stdin/inline)
    │  ├─ Parse YAML/JSON
    │  ├─ Resolve references
    │  └─ Return IOpenAPISpec
    │
    ├─ ToolsManager.loadTools()
    │  ├─ Extract operations from spec
    │  ├─ Create tools from operations
    │  ├─ Apply filters (tags/methods/resources)
    │  └─ Cache for lookup
    │
    └─ Transport Handler (Stdio/HTTP)
       └─ Listen for MCP requests
```

### 2. **Tool Discovery Flow** (tools/list)

```
MCP Client
    │
    ├─ tools/list request
    │
    ▼
OpenAPIServer.handleListTools()
    │
    ├─ ToolsManager.getAllTools()
    │  └─ Return all cached tools
    │
    └─ MCP Response: { tools: [...] }
         │
         └─ Client sees all available tools
```

### 3. **Tool Execution Flow** (tools/call)

```
MCP Client
    │
    ├─ tools/call with:
    │  ├─ toolName (e.g., "getUserById")
    │  └─ arguments: { userId: "123" }
    │
    ▼
OpenAPIServer.handleCallTool()
    │
    ├─ Check if meta-tool (list-endpoints, get-schema, invoke)
    │  └─ If yes: execute meta-tool logic
    │
    └─ If regular tool:
       │
       ├─ ToolsManager.getTool(name)
       │  └─ Return ITool with metadata
       │
       ├─ Parse parameters:
       │  ├─ Map arguments to path params
       │  ├─ Map arguments to query params
       │  ├─ Map arguments to request body
       │  └─ Construct complete request
       │
       ├─ ApiClient.executeApiCall()
       │  │
       │  ├─ Get auth headers via AuthProvider
       │  │
       │  ├─ Make HTTP request to target API
       │  │
       │  ├─ Check response status
       │  │
       │  └─ On 401/403:
       │     ├─ Call AuthProvider.handleAuthError()
       │     ├─ If returns true: retry once
       │     └─ If returns false: return error
       │
       └─ Return response to MCP client
          ├─ Success: JSON data
          └─ Error: error message
```

### 4. **Authentication Flow**

```
Request from ApiClient
    │
    ▼
Axios Request Interceptor
    │
    ├─ Call AuthProvider.getAuthHeaders()
    │  │
    │  ├─ Static: Return fixed headers immediately
    │  │
    │  └─ Dynamic:
    │     ├─ Check if token expired
    │     ├─ If expired: refresh token
    │     └─ Return fresh headers
    │
    ├─ Add headers to request
    │
    ▼
Target API (with auth headers)
    │
    ├─ 401/403 response
    │  │
    │  ▼
    │  ApiClient.handleAuthError()
    │  │
    │  ├─ Call AuthProvider.handleAuthError()
    │  │
    │  ├─ If true returned:
    │  │  └─ Retry request once (with fresh headers)
    │  │
    │  └─ If false returned:
    │     └─ Return error to client
    │
    └─ 2xx/4xx/5xx response
       └─ Return response data
```

---

## Component Interaction Matrix

### OpenAPIServer (Orchestrator)

**Depends On**:

- Configuration (IOpenAPIServerConfig)
- MCP SDK (Server, types)
- All child components

**Provides**:

- MCP protocol interface
- Tool discovery
- Tool execution
- Meta-tools

**Key Methods**:

- `start()` - Initialize and start server
- `stop()` - Graceful shutdown
- `handleListTools()` - MCP tools/list handler
- `handleCallTool()` - MCP tools/call handler

---

### OpenAPISpecLoader

**Dependencies**: None (axios, yaml)

**Provides**:

- Specification parsing
- Reference resolution
- Operation extraction
- Tag extraction

**Input Methods**:

1. URL (HTTP GET)
2. File (fs.readFile)
3. Stdin (process.stdin)
4. Inline (string parse)

**Output**: `IOpenAPISpec`

---

### ToolsManager

**Dependencies**: OpenAPISpecLoader

**Provides**:

- Tool creation
- Tool caching
- Tool filtering
- Tool lookup

**Filtering Modes**:

- `all`: All tools + optional filter
- `dynamic`: Meta-tools only
- `explicit`: Specific tools only

**Output**: Map<toolName, ITool>

---

### ApiClient

**Dependencies**: AuthProvider, axios

**Provides**:

- HTTP request execution
- Authentication header injection
- Error handling and retry
- Parameter mapping

**Request Pipeline**:

1. Get auth headers (via AuthProvider)
2. Build request config
3. Make HTTP request
4. Handle response/errors
5. Retry on auth errors if applicable

---

### AuthProvider

**Implementations**:

- `StaticAuthProvider` - Fixed headers
- Custom implementations - Token refresh

**Interface**:

```typescript
interface IAuthProvider {
  getAuthHeaders(): Promise<Record<string, string>>;
  handleAuthError(error: any): Promise<boolean>;
}
```

---

### Transport Handlers

**Stdio Transport**:

- Uses MCP SDK StdioServerTransport
- stdin/stdout communication
- For Claude Desktop

**HTTP Transport**:

- Custom Node.js HTTP server
- Port/host/path configuration
- CORS headers
- For web applications

---

## Type System Overview

### Core Types

**IOpenAPIServerConfig**

```typescript
{
  apiBaseUrl: string;              // Required
  openApiSpec?: string;            // Spec content
  specInputMethod?: SpecInputMethod; // url|file|stdin|inline
  headers?: Record<string, string>;
  authProvider?: IAuthProvider;
  transportType?: TransportType;   // stdio|http
  toolsMode?: ToolsMode;           // all|dynamic|explicit
  // ... more options
}
```

**ITool**

```typescript
{
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: {...} };
  tags?: string[];
  method?: string;           // HTTP method
  resourceName?: string;     // From path
  originalPath?: string;     // OpenAPI path
  toolId?: string;           // Unique ID
}
```

**IOpenAPISpec**

```typescript
{
  openapi: string;           // Version
  info: { title, version, description };
  paths: Record<string, Record<string, IOperation>>;
  components?: { schemas: {...} };
  tags?: Array<{ name, description }>;
}
```

---

## Code Organization

### `/src/types/` - Interface Definitions

**Files**:

- `core.ts` - Type aliases (SpecInputMethod, ToolsMode, etc.)
- `config.ts` - IOpenAPIServerConfig
- `auth.ts` - IAuthProvider
- `api.ts` - API client types
- `openapi.ts` - OpenAPI spec types
- `tools.ts` - ITool, IToolsFilter
- `transport.ts` - ITransportHandler, ITransportConfig

**Purpose**: Single source of truth for all types

---

### `/src/core/` - Server & Configuration

**Files**:

- `server.ts` - OpenAPIServer (521 lines)
  - Main orchestrator
  - MCP handlers
  - Lifecycle management

- `config.ts` - Configuration validation (144 lines)
  - validateConfig()
  - Default values
  - Environment variable loading

---

### `/src/openapi/` - Specification Processing

**Files**:

- `spec-loader.ts` - OpenAPISpecLoader (383 lines)
  - Load from various sources
  - Parse YAML/JSON
  - Resolve $ref references
  - Extract operations and tags

---

### `/src/tools/` - Tool Management

**Files**:

- `creation.ts` - Tool creation (301 lines)
  - createToolFromOperation()
  - createMetaTools()
  - Input schema generation

- `manager.ts` - ToolsManager (327 lines)
  - Load and filter tools
  - Tool lookup (by name/ID)
  - Statistics

- `utils/id-generator.ts` - Tool ID utilities (138 lines)
  - generateToolId() - METHOD::path format
  - parseToolId() - Reverse operation
  - Sanitization

- `utils/name-generator.ts` - Tool naming (345 lines)
  - Abbreviation algorithm
  - Vowel removal
  - Common word filtering
  - Hash generation for long names

---

### `/src/auth/` - Authentication

**Files**:

- `providers.ts` - Auth implementations (140 lines)
  - StaticAuthProvider
  - isAuthError() helper
  - Documentation of auth patterns

---

### `/src/api/` - HTTP Client

**Files**:

- `client.ts` - ApiClient (342 lines)
  - HTTP request execution
  - Auth header injection
  - Error handling and retry
  - Parameter mapping

---

### `/src/transport/` - Transport Layer

**Files**:

- `base.ts` - BaseTransportHandler (72 lines)
  - Abstract class
  - Factory function

- `stdio.ts` - Stdio transport (60 lines)
  - StdioServerTransport wrapper

- `http.ts` - HTTP transport (162 lines)
  - Node.js http.createServer()
  - Request routing
  - CORS support

---

### `/src/utils/` - Utilities

**Files**:

- `logger.ts` - Logging utility (50 lines)
  - Consistent log formatting
  - Debug, info, error levels

---

### `/src/cli.ts` - Command-Line Interface (338 lines)

**Features**:

- Commander.js for CLI parsing
- All config options available
- Environment variable support
- Version and help commands

---

### `/test/` - Test Suite (16 files, 463 tests)

**Organization**:

- Mirrors src/ structure
- One test file per source file
- Comprehensive coverage
- Unit + integration tests

---

## Execution Paths

### Scenario 1: Load Petstore API as MCP Tools

```bash
openapi-mcp-server \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/.../petstore.json \
  --transport stdio
```

**Execution**:

1. CLI parses arguments
2. validateConfig() validates
3. OpenAPIServer constructor called
4. server.start() called
5. OpenAPISpecLoader.loadSpec() downloads JSON
6. Spec parsed and references resolved
7. ToolsManager.loadTools() creates tools for each operation
8. StdioTransportHandler connected
9. Waiting for MCP client requests
10. Client calls tools/list
11. Server returns all Petstore operations as tools
12. Client calls specific tool (e.g., getPetById)
13. Server maps parameters and calls https://petstore.swagger.io/v2/pet/123
14. Response returned to client

````

### Scenario 2: Use Dynamic Authentication with Refresh

```typescript
class AuthProvider implements IAuthProvider {
  async getAuthHeaders() {
    if (isTokenExpired()) {
      this.token = await refreshToken();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async handleAuthError(error) {
    if (error.response?.status === 401) {
      this.token = await refreshToken();
      return true; // Retry
    }
    return false;
  }
}

const server = new OpenAPIServer({
  apiBaseUrl: 'https://api.example.com',
  openApiSpec: 'https://api.example.com/openapi.json',
  authProvider: new AuthProvider(),
  transportType: 'http'
});

await server.start();
````

**Execution**:

1. User creates custom AuthProvider
2. OpenAPIServer uses it
3. On each API call:
   - getAuthHeaders() called (checks expiry, refreshes if needed)
   - Request made with fresh headers
   - If 401 returned: handleAuthError() called
   - If returns true: Single retry with fresh token
   - Response returned to client

---

## Error Handling Strategy

### Validation Errors

- **Where**: config.ts, spec-loader.ts
- **Action**: Throw with descriptive message
- **Result**: Server fails to start

### Network Errors

- **Where**: api/client.ts, openapi/spec-loader.ts
- **Action**: Log and throw
- **Result**: Graceful error to MCP client

### Authentication Errors (401/403)

- **Where**: api/client.ts
- **Action**: Call authProvider.handleAuthError()
- **Result**: Retry once if provider returns true

### Tool Execution Errors

- **Where**: tools/manager.ts, core/server.ts
- **Action**: Catch, log, return error response
- **Result**: MCP client receives error message

---

## Configuration Cascade

```
Environment Variables
        ↓
CLI Arguments (override env vars)
        ↓
Inline Config (override CLI)
        ↓
validateConfig() (apply defaults)
        ↓
Final Configuration
```

**Example Priority**:

```
// Env var
OPENAPI_SPEC_PATH=https://api.com/spec.json

// CLI override
openapi-mcp-server --openapi-spec ./local-spec.yaml

// Code override
new OpenAPIServer({
  openApiSpec: "inline: {\"openapi\": \"3.0.0\", ...}"
})
```

Result: Uses inline spec (highest priority)

---

## Summary

The **OpenAPI MCP Server** architecture demonstrates:

✅ **Clear separation of concerns** - Each module has single responsibility  
✅ **Dependency injection** - Components receive dependencies  
✅ **Interface contracts** - All types defined upfront  
✅ **Modular design** - Easy to understand, test, extend  
✅ **Error handling** - Comprehensive error handling throughout  
✅ **Type safety** - TypeScript strict mode  
✅ **Documentation** - Code is self-documenting

This architecture makes the codebase:

- **Maintainable** - Clear structure, easy to modify
- **Testable** - Mockable dependencies, isolated components
- **Extensible** - Add new auth, transport, filtering logic
- **Reliable** - Comprehensive error handling
- **Performant** - Efficient algorithms, caching
