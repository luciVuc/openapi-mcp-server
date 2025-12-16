/**
 * OpenAPI MCP Server - Main Library Entry Point
 *
 * A Model Context Protocol (MCP) server that exposes OpenAPI endpoints as MCP resources.
 * This server allows Large Language Models to discover and interact with REST APIs
 * defined by OpenAPI specifications through the MCP protocol.
 *
 * ## Architecture Overview
 *
 * The server uses an interface-based architecture with clear separation of concerns:
 *
 * - **Types (@types/)**: Interface definitions for type safety and modularity
 * - **Core Classes**: Implementation of the main server functionality
 * - **Transport Layer**: Support for stdio and HTTP transports
 * - **Tool Management**: Dynamic tool creation and filtering from OpenAPI specs
 * - **Authentication**: Static and dynamic authentication providers
 *
 * ## Key Features
 *
 * - **Multiple OpenAPI Input Methods**: URL, file, stdin, inline specification loading
 * - **Dynamic Tool Creation**: Automatically generates MCP tools from OpenAPI operations
 * - **Advanced Filtering**: Filter tools by tags, resources, operations, or explicit lists
 * - **Authentication Support**: Static headers or dynamic authentication providers
 * - **Tool Name Abbreviation**: Smart tool name generation with ≤64 character limit
 * - **Transport Flexibility**: Stdio for Claude Desktop, HTTP for web applications
 * - **Meta-Tools**: Built-in tools for API exploration and dynamic endpoint invocation
 *
 * @example Basic Usage
 * ```typescript
 * import { OpenAPIServer } from '@lucid-spark/openapi-mcp-server';
 *
 * const server = new OpenAPIServer({
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: 'https://api.example.com/openapi.json',
 *   specInputMethod: 'url',
 *   transportType: 'stdio'
 * });
 *
 * await server.start();
 * ```
 *
 * @example With Authentication
 * ```typescript
 * const server = new OpenAPIServer({
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: './api-spec.yaml',
 *   specInputMethod: 'file',
 *   headers: {
 *     'Authorization': 'Bearer your-token',
 *     'X-API-Key': 'your-key'
 *   },
 *   transportType: 'stdio'
 * });
 * ```
 *
 * @example With Dynamic Authentication
 * ```typescript
 * class MyAuthProvider implements IAuthProvider {
 *   async getAuthHeaders() {
 *     return { Authorization: `Bearer ${await this.getValidToken()}` };
 *   }
 *
 *   async handleAuthError(error) {
 *     await this.refreshToken();
 *     return true; // Retry request
 *   }
 * }
 *
 * const server = new OpenAPIServer({
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: './api-spec.yaml',
 *   specInputMethod: 'file',
 *   authProvider: new MyAuthProvider(),
 *   transportType: 'stdio'
 * });
 * ```
 */

// ============================================================================
// CORE SERVER CLASS
// ============================================================================

/** Main OpenAPI MCP Server implementation */
export { OpenAPIServer } from "./core/server";

// ============================================================================
// CONFIGURATION SYSTEM
// ============================================================================

/** Configuration validation and default values */
export { validateConfig, DEFAULT_CONFIG } from "./core/config";

// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

/** Static authentication provider and utilities */
export { StaticAuthProvider, isAuthError } from "./auth";

// ============================================================================
// OPENAPI SPECIFICATION HANDLING
// ============================================================================

/** OpenAPI specification loader with multiple input methods */
export { OpenAPISpecLoader } from "./openapi/spec-loader";

// ============================================================================
// TOOL MANAGEMENT SYSTEM
// ============================================================================

/** Tool creation utilities for converting OpenAPI operations to MCP tools */
export { createToolFromOperation, createMetaTools } from "./tools/creation";

/** Tools manager for filtering and organizing MCP tools */
export { ToolsManager } from "./tools/manager";

// ============================================================================
// API CLIENT
// ============================================================================

/** HTTP client for authenticated API requests */
export { ApiClient } from "./api";

// ============================================================================
// TOOL UTILITIES
// ============================================================================

/** Tool ID generation and parsing utilities */
export {
  generateToolId,
  parseToolId,
  sanitizeForToolId,
  extractResourceName,
  isValidToolId,
  isValidHttpMethod,
  HTTP_METHODS,
} from "./tools/utils/id-generator";

/** Tool name abbreviation utilities */
export {
  generateToolName,
  isValidToolName,
} from "./tools/utils/name-generator";

// ============================================================================
// TRANSPORT LAYER
// ============================================================================

/** MCP transport implementations (stdio and HTTP) */
export {
  BaseTransportHandler,
  StdioTransportHandler,
  HttpTransportHandler,
  createTransportHandler,
} from "./transport";

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

/** Logging utilities with debug support */
export { Logger, logger, setDebugMode } from "./utils/logger";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Re-export MCP SDK types */
export type { Tool } from "@modelcontextprotocol/sdk/types.js";

/** Export all interface definitions from types directory */
export * from "./types";
