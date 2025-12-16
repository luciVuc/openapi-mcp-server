/**
 * Tool ID utilities for generating and parsing tool identifiers
 * Uses double underscore (__) as path separator for robustness
 */

import { HttpMethod } from "../../types";

/**
 * Generate a tool ID from HTTP method and path
 * Format: METHOD::pathPart
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - OpenAPI path (e.g., `/api/v1/users/{id}`, `/api/v1/users/{id}/details`)
 * @returns Tool ID (e.g., `GET::api__v1__users__---id`, `POST::api__v1__users__---id__details`)
 */
export function generateToolId(method: string, path: string): string {
  // Clean and normalize the path
  const cleanPath = path
    .replace(/^\//, "") // Remove leading slash
    .replace(/\/+/g, "/") // Collapse multiple slashes
    .replace(/\/$/, "") // Remove trailing slash
    .replace(/\{([^}]+)\}/g, "---$1") // Convert {param} to ---param
    .replace(/\//g, "__"); // Convert slashes to double underscores

  const sanitizedPath = sanitizeForToolId(cleanPath);

  return `${method.toUpperCase()}::${sanitizedPath}`;
}

/**
 * Parse a tool ID back into method and path
 *
 * @param toolId - Tool ID to parse
 * @returns Object with method and path
 */
export function parseToolId(toolId: string): { method: string; path: string } {
  const [method, pathPart] = toolId.split("::", 2);

  if (!method || !pathPart) {
    throw new Error(`Invalid tool ID format: ${toolId}`);
  }

  // Convert double underscores back to slashes and restore path parameters
  const path =
    "/" + pathPart.replace(/__/g, "/").replace(/---([^\/]+)/g, "{$1}");

  return { method: method.toUpperCase(), path };
}

/**
 * Sanitize a string for use in tool IDs
 * Ensures only safe characters [A-Za-z0-9_-] are used
 *
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeForToolId(input: string): string {
  return (
    input
      // Remove disallowed characters (keep only alphanumeric, underscore, hyphen)
      .replace(/[^A-Za-z0-9_-]/g, "")
      // Collapse sequences of 3+ underscores to double underscore (preserve path separator)
      .replace(/_{3,}/g, "__")
      // Trim leading/trailing underscores and hyphens
      .replace(/^[_-]+|[_-]+$/g, "")
  );
}

/**
 * Extract resource name from a path for filtering
 * Uses the last meaningful segment as the resource name
 *
 * @param path - OpenAPI path
 * @returns Resource name or undefined
 */
export function extractResourceName(path: string): string | undefined {
  const segments = path.replace(/^\//, "").split("/");

  // Find the last segment that's not a parameter and not a common word
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];

    // Skip parameter segments (e.g., {id}, {userId})
    if (segment.startsWith("{") && segment.endsWith("}")) {
      continue;
    }

    // Skip empty segments
    if (!segment) {
      continue;
    }

    // Skip common API path segments
    if (["api", "v1", "v2", "v3", "v4"].includes(segment.toLowerCase())) {
      continue;
    }

    return segment.toLowerCase();
  }

  return segments[0] || undefined;
}

/**
 * Validate that a tool ID is properly formatted
 *
 * @param toolId - Tool ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidToolId(toolId: string): boolean {
  try {
    const { method, path } = parseToolId(toolId);
    return !!method && !!path && /^[A-Z]+$/.test(method);
  } catch {
    return false;
  }
}

/**
 * Common HTTP methods supported
 */
export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

/**
 * Check if a string is a valid HTTP method
 */
export function isValidHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHODS.includes(method.toUpperCase() as HttpMethod);
}
