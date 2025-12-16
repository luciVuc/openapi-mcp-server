/**
 * Core type definitions
 */

/**
 * OpenAPI specification input methods
 */
export type SpecInputMethod = "url" | "file" | "stdin" | "inline";

/**
 * Tools loading modes
 */
export type ToolsMode = "all" | "dynamic" | "explicit";

/**
 * Transport types supported by the server
 */
export type TransportType = "stdio" | "http";

/**
 * HTTP methods supported
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";
