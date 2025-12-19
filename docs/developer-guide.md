# Developer Guide

This guide is for developers who want to contribute to the OpenAPI MCP Server project or understand its internal architecture and implementation details.

## Table of Contents

- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Building and Publishing](#building-and-publishing)
- [Contributing Guidelines](#contributing-guidelines)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)

## Development Environment

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **TypeScript**: 5.3.0 or higher
- **Git**: Latest version
- **VS Code**: Recommended with TypeScript extension

### Setup

```bash
# Clone the repository
git clone https://github.com/lucivuc/openapi-mcp-server.git
cd openapi-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Verify installation
npm run cli -- --help
```

### Development Scripts

```bash
# Development and Testing
npm run build                    # Build TypeScript
npm run test                     # Run test suite
npm run test:watch              # Run tests in watch mode
npm run test:coverage           # Run tests with coverage
npm run test:verbose            # Run tests with verbose output

# Development Servers
npm run dev:petstore:v2:json    # Petstore API v2.0 JSON
npm run dev:petstore:v3:yaml    # Petstore API v3.0 YAML
npm run dev:petstore:v3.1:json  # Petstore API v3.1 JSON

# MCP Inspector (for testing)
npm run inspect:petstore:v2:json
npm run inspect:petstore:v3:yaml

# Code Quality
npm run format                  # Format code with Prettier
npm run format:staged          # Format staged files only
npm run depcheck               # Check for unused dependencies

# Docker
npm run docker:build           # Build Docker image
npm run docker:run            # Run Docker container
npm run docker:test           # Run tests in Docker
```

## Project Structure

### Source Code Organization

```
src/
├── types/                  # TypeScript interface definitions
│   ├── core.ts            # Core type definitions
│   ├── config.ts          # Configuration interfaces
│   ├── auth.ts            # Authentication interfaces
│   ├── api.ts             # API client interfaces
│   ├── openapi.ts         # OpenAPI specification interfaces
│   ├── tools.ts           # Tool management interfaces
│   ├── transport.ts       # Transport interfaces
│   └── index.ts           # Type exports
├── core/                  # Core server implementation
│   ├── config.ts          # Configuration validation and defaults
│   ├── server.ts          # Main OpenAPIServer class
│   └── index.ts           # Core exports
├── auth/                  # Authentication system
│   ├── providers.ts       # StaticAuthProvider and utilities
│   └── index.ts           # Authentication exports
├── api/                   # HTTP client implementation
│   ├── client.ts          # ApiClient class
│   └── index.ts           # API client exports
├── tools/                 # Tool management system
│   ├── creation.ts        # Tool creation from OpenAPI operations
│   ├── manager.ts         # ToolsManager class
│   ├── utils/            # Tool utilities
│   │   ├── id-generator.ts    # Tool ID generation and parsing
│   │   ├── name-generator.ts  # Tool name generation and abbreviation
│   │   └── index.ts          # Utility exports
│   └── index.ts          # Tools exports
├── transport/            # Transport layer implementations
│   ├── base.ts          # Base transport handler and factory
│   ├── stdio.ts         # Stdio transport for Claude Desktop
│   ├── http.ts          # HTTP transport for web applications
│   └── index.ts         # Transport exports
├── openapi/             # OpenAPI specification handling
│   ├── spec-loader.ts   # OpenAPISpecLoader class
│   └── index.ts         # OpenAPI exports
├── utils/               # Shared utilities
│   ├── logger.ts        # Logging system with debug support
│   └── index.ts         # Utility exports
├── cli.ts               # Command-line interface
└── index.ts             # Main library entry point
```

### Key Architectural Patterns

1. **Interface-First Design**: Every major component implements a well-defined TypeScript interface
2. **Dependency Injection**: Components receive their dependencies through constructor injection
3. **Factory Pattern**: Transport handlers and other components are created using factory functions
4. **Strategy Pattern**: Authentication providers and tool filters use the strategy pattern
5. **Async/Await**: All I/O operations use modern async/await patterns

## Architecture Deep Dive

### Core Components

#### OpenAPIServer (src/core/server.ts)

The main orchestrator class that coordinates all system components.

**Key Responsibilities:**

- Configuration validation and normalization
- Component initialization and lifecycle management
- MCP protocol request/response handling
- Error handling and logging

**Implementation Highlights:**

```typescript
export class OpenAPIServer {
  private server: Server; // MCP SDK server
  private specLoader: OpenAPISpecLoader; // OpenAPI spec handling
  private toolsManager: ToolsManager; // Tool management
  private apiClient: ApiClient; // HTTP client
  private transportHandler: ITransportHandler | null = null;

  constructor(config: IOpenAPIServerConfig) {
    this.config = validateConfig(config);
    // Component initialization...
  }
}
```

#### ToolsManager (src/tools/manager.ts)

Manages the creation, filtering, and caching of MCP tools from OpenAPI operations.

**Key Responsibilities:**

- Converting OpenAPI operations to MCP tools
- Implementing tool filtering strategies
- Caching tools for performance
- Providing tool lookup and statistics

#### ApiClient (src/api/client.ts)

Handles authenticated HTTP requests to target APIs with retry logic.

**Key Responsibilities:**

- Authentication integration (static and dynamic)
- HTTP request construction and execution
- Error handling and retry logic
- Response processing and formatting

### Authentication System

The authentication system uses the Strategy pattern with the `IAuthProvider` interface:

```typescript
interface IAuthProvider {
  getAuthHeaders(): Promise<Record<string, string>>;
  handleAuthError(error: AxiosError): Promise<boolean>;
}
```

**Static Authentication:**

```typescript
class StaticAuthProvider implements IAuthProvider {
  constructor(private headers: Record<string, string>) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    return { ...this.headers };
  }

  async handleAuthError(): Promise<boolean> {
    return false; // Static auth can't handle errors
  }
}
```

**Dynamic Authentication Pattern:**

```typescript
class DynamicAuthProvider implements IAuthProvider {
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    if (error.response?.status === 401) {
      await this.refreshToken();
      return true; // Retry the request
    }
    return false;
  }
}
```

### Transport Layer

The transport layer supports multiple communication protocols through a common interface:

```typescript
interface ITransportHandler {
  start(): Promise<void>;
  stop(): Promise<void>;
  getType(): string;
  getStatus(): { type: string; active: boolean };
}
```

**Stdio Transport**: Optimized for Claude Desktop integration
**HTTP Transport**: RESTful endpoints for web applications

### Tool System

#### Tool ID Generation

Tools are identified using a robust encoding system:

```typescript
// Format: METHOD::path__encoded__with__underscores
function generateToolId(method: string, path: string): string {
  const pathPart = path
    .split("/")
    .filter((p) => p)
    .map((p) =>
      p.startsWith("{") && p.endsWith("}")
        ? `---${p.slice(1, -1)}---` // {id} -> ---id---
        : p,
    )
    .join("__");

  return `${method.toUpperCase()}::${pathPart}`;
}
```

#### Tool Name Generation

Tool names are generated with intelligent abbreviation to meet MCP's 64-character limit:

```typescript
function generateToolName(
  baseName: string,
  disableAbbreviation: boolean = false,
  namespace?: string,
): string {
  let name = baseName
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  if (!disableAbbreviation && name.length > 64) {
    name = applyAbbreviations(name);
  }

  if (namespace) {
    name = `${namespace}-${name}`;
  }

  return name;
}
```

## Development Workflow

### Branch Strategy

- `main`: Stable release branch
- `develop`: Integration branch for new features
- `feature/*`: Feature development branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Emergency fixes for production

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(tools): add support for OpenAPI 3.1 specifications
fix(auth): handle token refresh race conditions
docs(readme): update installation instructions
```

### Code Style

The project uses Prettier for code formatting and strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Adding New Features

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Define Interfaces First**
   - Add type definitions to `src/types/`
   - Export from appropriate index files

3. **Implement Core Logic**
   - Create implementation in appropriate module
   - Follow existing patterns and conventions

4. **Add Tests**
   - Create test files with `.test.ts` extension
   - Aim for >80% code coverage

5. **Update Documentation**
   - Update README if needed
   - Add JSDoc comments to public APIs
   - Update website documentation if applicable

6. **Submit Pull Request**
   - Ensure all tests pass
   - Update CHANGELOG.md
   - Request code review

## Testing Strategy

### Test Organization

```
test/
├── setup.ts              # Test configuration
├── types.d.ts            # Test type definitions
├── api/                  # API client tests
├── auth/                 # Authentication tests
├── core/                 # Core server tests
├── openapi/              # OpenAPI spec loader tests
├── tools/                # Tool management tests
├── transport/            # Transport layer tests
└── utils/                # Utility function tests
```

### Test Types

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete workflows
4. **Performance Tests**: Validate performance characteristics

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- api/client.test.ts

# Run in watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

### Test Utilities

The project provides test utilities for common testing scenarios:

```typescript
// Test helper for creating mock servers
import { createMockServer } from "../test/utils/mock-server";

// Test helper for OpenAPI specs
import { createMockOpenAPISpec } from "../test/utils/mock-openapi";
```

## Building and Publishing

### Build Process

The build process compiles TypeScript to JavaScript and generates type definitions:

```bash
# Clean build
rm -rf dist/
npm run build

# Verify build output
ls -la dist/
```

### Publishing Checklist

1. **Update Version**

   ```bash
   npm version patch|minor|major
   ```

2. **Update Documentation**
   - Update CHANGELOG.md
   - Verify README is current
   - Check website documentation

3. **Run Full Test Suite**

   ```bash
   npm test
   npm run test:coverage
   ```

4. **Build and Verify**

   ```bash
   npm run build
   npm run cli -- --version
   ```

5. **Publish**
   ```bash
   npm publish
   ```

### Docker Publishing

```bash
# Build multi-arch image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t reallv/openapi-mcp-server:latest \
  -t reallv/openapi-mcp-server:$(node -p "require('./package.json').version") \
  --push .
```

## Contributing Guidelines

### Code Review Process

1. All changes must go through pull request review
2. At least one maintainer approval required
3. All CI checks must pass
4. Documentation must be updated for user-facing changes

### Issue Triage

Issues are labeled and prioritized:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed

### Security

- Report security vulnerabilities privately
- Follow responsible disclosure practices
- Security patches get priority review

## Debugging and Troubleshooting

### Debug Mode

Enable comprehensive logging:

```bash
# CLI usage
npm run cli -- --debug

# Environment variable
DEBUG=true npm start

# Library usage
const server = new OpenAPIServer({ debug: true, ... });
```

### Common Development Issues

#### TypeScript Compilation Errors

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Rebuild from clean state
rm -rf dist/ node_modules/
npm install
npm run build
```

#### Test Failures

```bash
# Run tests with verbose output
npm run test:verbose

# Debug specific test
npm test -- --detectOpenHandles api/client.test.ts
```

#### Performance Issues

```bash
# Profile tool generation
NODE_ENV=development npm run dev:petstore:v3:json

# Monitor memory usage
node --inspect dist/cli.js --debug
```

### Debugging Tools

1. **VS Code Debugger**: Launch configurations included
2. **Node.js Inspector**: Built-in debugging support
3. **MCP Inspector**: Official MCP protocol debugger
4. **Performance Profiling**: Node.js built-in profiler

### Logging

The project uses a structured logging system:

```typescript
import { logger } from "../utils/logger";

// Different log levels
logger.debug("Detailed debug information");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error occurred", error);
```

### Common Debugging Scenarios

#### Authentication Issues

```bash
# Enable auth debug logging
DEBUG=auth npm run cli -- --debug
```

#### OpenAPI Spec Loading

```bash
# Test spec loading independently
curl -s https://api.example.com/openapi.json | jq .
```

#### Tool Generation

```bash
# Verify tool creation
npm run cli -- --debug --tools dynamic
```

## Performance Considerations

### Memory Usage

- Monitor tool generation memory consumption
- Use filtering to reduce memory footprint
- Profile with Node.js built-in profiler

### Request Performance

- HTTP connection pooling is enabled
- Authentication headers are cached
- Implement request timeouts appropriately

### Scalability

- Server is stateless and can be horizontally scaled
- Use HTTP transport for load balancing
- Consider rate limiting for production deployments

## Future Development

### Planned Features

1. **WebSocket Transport**: Real-time MCP communication
2. **Plugin System**: Dynamic loading of extensions
3. **Advanced Caching**: Redis integration for tool caching
4. **Metrics Integration**: Prometheus/OpenTelemetry support

### Architecture Evolution

- Microservice decomposition for large deployments
- Event-driven architecture for real-time updates
- GraphQL integration for complex API scenarios

---

For questions or support, please:

1. Check the [troubleshooting guide](../docs/pages/troubleshooting.html)
2. Search existing [GitHub issues](https://github.com/lucivuc/openapi-mcp-server/issues)
3. Join the [discussions](https://github.com/lucivuc/openapi-mcp-server/discussions)
4. Contact the maintainers

**Happy coding! 🚀**
