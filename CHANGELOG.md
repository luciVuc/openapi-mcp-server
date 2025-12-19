# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-19

### Added

- Comprehensive documentation updates
- Missing LICENSE file
- CONTRIBUTING.md with development guidelines
- Full JSDoc documentation for all public APIs

### Changed

- Updated package.json description for accuracy
- Enhanced configuration interface documentation

### Fixed

- Documentation inconsistencies across files
- Missing namespace option in various documentation files

## [1.0.0] - 2025-10-20

### Added

- Initial release of OpenAPI MCP Server
- Dynamic tool generation from OpenAPI specifications
- Support for OpenAPI 2.0, 3.0, and 3.1 specifications
- Multiple input methods: URL, file, stdin, inline
- Flexible authentication system with static headers and dynamic providers
- Advanced tool filtering by tags, resources, operations, and explicit lists
- Two transport types: stdio (for Claude Desktop) and HTTP (for web applications)
- Smart tool name generation with abbreviation support (≤64 characters)
- Three meta-tools for dynamic API exploration:
  - `list-api-endpoints` - List available endpoints with filtering
  - `get-api-endpoint-schema` - Get detailed endpoint schemas
  - `invoke-api-endpoint` - Directly invoke any endpoint
- Comprehensive configuration system with environment variable support
- Command-line interface with full option support
- TypeScript library support for custom implementations
- Robust error handling and validation
- Debug logging capabilities
- Tool namespace support for better organization
- Complete test suite with high coverage
- Extensive examples and documentation

### Features

- **OpenAPI Specification Loading**: URL, file, stdin, and inline methods
- **Authentication**: Static headers and dynamic authentication providers
- **Transport Layer**: stdio and HTTP transports with session management
- **Tool Management**: Three modes (all, dynamic, explicit) with advanced filtering
- **Schema Processing**: Full $ref resolution and schema composition
- **Tool System**: Intelligent ID generation and name abbreviation
- **Configuration**: Environment variables, CLI arguments, and programmatic config
- **Type Safety**: Complete TypeScript interfaces and type definitions
- **Error Handling**: Comprehensive error recovery and user-friendly messages
- **Documentation**: Inline JSDoc, README, examples, and website documentation

### Supported APIs

- Any OpenAPI 2.0, 3.0, or 3.1 compliant API
- Public APIs (no authentication required)
- APIs with API keys, bearer tokens, or custom headers
- APIs with OAuth 2.0 (via custom authentication providers)
- Local development APIs
- Enterprise APIs with complex authentication

[unreleased]: https://github.com/lucivuc/openapi-mcp-server/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/lucivuc/openapi-mcp-server/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/lucivuc/openapi-mcp-server/releases/tag/v1.0.0
