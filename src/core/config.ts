/**
 * Configuration System for OpenAPI MCP Server
 *
 * This module provides configuration validation and default values for the OpenAPI MCP Server.
 * It uses interface-based configuration with comprehensive validation and normalization.
 *
 * ## Configuration Interface
 *
 * The server configuration is defined by the `IOpenAPIServerConfig` interface, which includes:
 *
 * - **Required Fields**: `apiBaseUrl` (the only truly required field)
 * - **OpenAPI Spec**: Various methods to load OpenAPI specifications
 * - **Authentication**: Static headers or dynamic authentication providers
 * - **Transport**: stdio for Claude Desktop, HTTP for web applications
 * - **Tool Filtering**: Advanced filtering by tags, resources, operations
 * - **Server Options**: Name, version, debug mode, etc.
 *
 * ## Environment Variable Support
 *
 * The CLI automatically loads configuration from environment variables:
 *
 * - `API_BASE_URL`: Base URL for the API endpoints
 * - `OPENAPI_SPEC_PATH`: Path or URL to OpenAPI specification
 * - `OPENAPI_SPEC_INLINE`: Inline OpenAPI specification content
 * - `OPENAPI_SPEC_FROM_STDIN`: Set to "true" to read from stdin
 * - `API_HEADERS`: Comma-separated key:value pairs for headers
 * - `SERVER_NAME`, `SERVER_VERSION`, `NAMESPACE`: Server identification
 * - `TRANSPORT_TYPE`: "stdio" or "http"
 * - `HTTP_PORT`, `HTTP_HOST`, `ENDPOINT_PATH`: HTTP transport settings
 * - `TOOLS_MODE`: "all", "dynamic", or "explicit"
 * - `DISABLE_ABBREVIATION`: Set to "true" to disable name abbreviation
 *
 * ## Configuration Validation
 *
 * The `validateConfig` function performs comprehensive validation:
 *
 * 1. **Required Fields**: Ensures `apiBaseUrl` is provided
 * 2. **Spec Input Method**: Validates OpenAPI specification input method
 * 3. **Enum Validation**: Validates enumerated values (toolsMode, transportType)
 * 4. **Mutual Exclusion**: Warns about conflicting options (authProvider vs headers)
 * 5. **Default Values**: Applies sensible defaults for optional fields
 *
 * @example Basic Configuration
 * ```typescript
 * const config = validateConfig({
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: 'https://api.example.com/openapi.json'
 * });
 * ```
 *
 * @example Advanced Configuration
 * ```typescript
 * const config = validateConfig({
 *   name: 'my-api-server',
 *   version: '2.0.0',
 *   namespace: 'my-api',
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: './specs/api.yaml',
 *   specInputMethod: 'file',
 *   authProvider: new MyAuthProvider(),
 *   transportType: 'http',
 *   httpPort: 8080,
 *   toolsMode: 'all',
 *   includeTags: ['public'],
 *   includeOperations: ['GET'],
 *   disableAbbreviation: false,
 *   debug: true
 * });
 * ```
 */

import { IOpenAPIServerConfig } from "../types";
import { logger } from "../utils/logger";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<IOpenAPIServerConfig> = {
  name: "openapi-mcp-server",
  version: "1.0.0",
  transportType: "stdio",
  httpPort: 3000,
  httpHost: "127.0.0.1",
  endpointPath: "/mcp",
  toolsMode: "all",
  specInputMethod: "url",
  disableAbbreviation: false,
  debug: false,
};

/**
 * Validate and normalize configuration
 */
export function validateConfig(
  config: IOpenAPIServerConfig,
): IOpenAPIServerConfig {
  // Validate required fields
  if (!config.apiBaseUrl) {
    throw new Error("apiBaseUrl is required");
  }

  // Validate spec input method and corresponding data
  const hasSpec = !!config.openApiSpec;
  const isStdin = config.specInputMethod === "stdin";
  const isInline = config.specInputMethod === "inline";

  if (!hasSpec && !isStdin && !isInline) {
    throw new Error(
      "openApiSpec is required unless using stdin or inline input method",
    );
  }

  // Validate tools mode
  if (
    config.toolsMode &&
    !["all", "dynamic", "explicit"].includes(config.toolsMode)
  ) {
    throw new Error("toolsMode must be one of: all, dynamic, explicit");
  }

  // Validate transport type
  if (
    config.transportType &&
    !["stdio", "http"].includes(config.transportType)
  ) {
    throw new Error("transportType must be one of: stdio, http");
  }

  // Validate that authProvider and headers are not both provided
  if (config.authProvider && config.headers) {
    logger.warn(
      "Both authProvider and headers provided. authProvider takes precedence.",
    );
  }

  // Merge with defaults
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

export default validateConfig;
