# Contributing to OpenAPI MCP Server

We welcome contributions to the OpenAPI MCP Server! This document provides guidelines for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/lucivuc/openapi-mcp-server.git
   cd openapi-mcp-server
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/lucivuc/openapi-mcp-server.git
   ```

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Run tests:

   ```bash
   npm test
   ```

4. Start development with a sample API:
   ```bash
   npm run dev:petstore:v3:json
   ```

## Making Changes

### Branch Naming

Create a descriptive branch name:

- `feature/add-websocket-transport`
- `fix/tool-name-generation`
- `docs/update-authentication-guide`
- `refactor/cleanup-config-validation`

### Code Organization

The project follows a modular architecture:

```
src/
├── types/           # TypeScript interface definitions
├── core/           # Core server implementation
├── auth/           # Authentication providers
├── api/            # HTTP client and API interactions
├── tools/          # Tool management and creation
├── transport/      # Transport implementations (stdio/HTTP)
├── openapi/        # OpenAPI specification handling
├── utils/          # Utility functions
├── cli.ts          # Command-line interface
└── index.ts        # Library entry point
```

### Key Principles

1. **Interface-Based Design**: Define interfaces in `types/` before implementation
2. **Type Safety**: Use TypeScript strictly, avoid `any` types
3. **Modularity**: Keep components loosely coupled and focused
4. **Testability**: Write testable code with dependency injection
5. **Documentation**: Include comprehensive JSDoc comments

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- auth/providers.test.ts
```

### Writing Tests

- Place test files alongside source files with `.test.ts` extension
- Use descriptive test names and organize with `describe` blocks
- Test both success and error scenarios
- Mock external dependencies appropriately

Example test structure:

```typescript
describe("ToolsManager", () => {
  describe("constructor", () => {
    it("should initialize with valid configuration", () => {
      // test implementation
    });
  });

  describe("loadTools", () => {
    it("should load tools from OpenAPI specification", () => {
      // test implementation
    });

    it("should handle invalid specifications gracefully", () => {
      // test implementation
    });
  });
});
```

### Test Coverage

- Maintain test coverage above 80%
- Focus on critical paths and edge cases
- Test public APIs thoroughly
- Mock external services and file system operations

## Submitting Changes

### Pull Request Process

1. Ensure your branch is up to date:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Run the full test suite:

   ```bash
   npm test
   npm run format
   ```

3. Push your changes:

   ```bash
   git push origin your-branch-name
   ```

4. Create a pull request on GitHub

### Pull Request Guidelines

- **Title**: Use clear, descriptive titles
- **Description**: Explain what changes were made and why
- **Link Issues**: Reference any related issues
- **Tests**: Include tests for new functionality
- **Documentation**: Update docs for user-facing changes

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
```

## Code Style

### TypeScript Standards

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Include JSDoc comments for public APIs

### Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Format only staged files
npm run format:staged
```

### ESLint Rules (when added)

- No unused variables
- Consistent naming conventions
- Prefer const/let over var
- Use semicolons consistently

### Code Example

```typescript
/**
 * Creates a tool from an OpenAPI operation
 *
 * @param operation - The OpenAPI operation definition
 * @param path - The API path for the operation
 * @param method - The HTTP method
 * @returns The created MCP tool
 */
export function createToolFromOperation(
  operation: IOperation,
  path: string,
  method: HttpMethod,
): ITool {
  const toolId = generateToolId(method, path);
  const toolName = generateToolName(operation, method, path);

  return {
    name: toolName,
    description:
      operation.description || operation.summary || `${method} ${path}`,
    inputSchema: createInputSchema(operation),
    toolId,
    method,
    tags: operation.tags,
  };
}
```

## Documentation

### Types of Documentation

1. **Code Documentation**: JSDoc comments for all public APIs
2. **README Updates**: Keep README.md current with features
3. **Examples**: Add examples for new functionality
4. **API Documentation**: Update docs/ when interfaces change

### Documentation Standards

- Use clear, concise language
- Include code examples
- Document edge cases and error scenarios
- Keep examples working and up to date

### Building Docs

```bash
# Generate API documentation (if tool is set up)
npm run docs:generate

# Serve documentation locally
npm run docs:serve
```

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and questions
- Focus on constructive feedback
- Maintain professional communication

### Communication Channels

- **Issues**: For bugs, feature requests, and questions
- **Discussions**: For general conversation and ideas
- **Pull Requests**: For code review and collaboration

### Reporting Issues

When reporting bugs, include:

- OpenAPI MCP Server version
- Node.js version
- Operating system
- Minimal reproduction steps
- Expected vs actual behavior
- Relevant logs or error messages

## Release Process

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Create GitHub release
- [ ] Publish to npm

## Getting Help

- Check existing issues and discussions
- Read the documentation thoroughly
- Ask questions in GitHub Discussions
- Join community chat (if available)

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Project documentation

Thank you for contributing to OpenAPI MCP Server! 🚀
