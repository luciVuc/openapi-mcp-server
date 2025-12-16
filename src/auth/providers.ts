/**
 * Authentication System for OpenAPI MCP Server
 *
 * This module provides authentication support for the OpenAPI MCP Server with both
 * static and dynamic authentication capabilities. The system uses an interface-based
 * approach for maximum flexibility and extensibility.
 *
 * ## Authentication Patterns
 *
 * ### Static Authentication (Backward Compatible)
 *
 * Uses fixed headers that don't change during execution:
 *
 * ```typescript
 * const server = new OpenAPIServer({
 *   // ... other config
 *   headers: {
 *     'Authorization': 'Bearer static-token',
 *     'X-API-Key': 'api-key'
 *   }
 * });
 * ```
 *
 * ### Dynamic Authentication (Advanced)
 *
 * Implements the `IAuthProvider` interface for token refresh and dynamic headers:
 *
 * ```typescript
 * class MyAuthProvider implements IAuthProvider {
 *   async getAuthHeaders() {
 *     // Called before each API request
 *     if (this.isTokenExpired()) {
 *       throw new Error('Token expired');
 *     }
 *     return { Authorization: `Bearer ${this.token}` };
 *   }
 *
 *   async handleAuthError(error) {
 *     // Called when API returns 401/403
 *     try {
 *       await this.refreshToken();
 *       return true; // Retry request
 *     } catch {
 *       return false; // Don't retry
 *     }
 *   }
 * }
 * ```
 *
 * ## Authentication Flow
 *
 * 1. **Before Each Request**: `getAuthHeaders()` is called to get fresh headers
 * 2. **Request Execution**: Headers are applied to the HTTP request
 * 3. **Error Handling**: If 401/403 received, `handleAuthError()` is called
 * 4. **Retry Logic**: If `handleAuthError()` returns true, request is retried once
 * 5. **Error Propagation**: If retry fails or not requested, error is returned
 *
 * ## Key Benefits
 *
 * - **Token Refresh**: Automatic token refresh before expiration
 * - **Dynamic Headers**: Headers can change based on request context
 * - **Error Recovery**: Intelligent handling of authentication failures
 * - **Backward Compatibility**: Existing static header configurations work unchanged
 * - **Retry Logic**: Automatic retry with fresh credentials after auth errors
 *
 * ## Implementation Notes
 *
 * - Authentication providers should handle their own token storage and refresh logic
 * - The system automatically converts static headers to `StaticAuthProvider` internally
 * - Only one retry attempt is made to prevent infinite loops
 * - Authentication errors (401/403) are detected automatically
 *
 * @example Token Refresh Pattern
 * ```typescript
 * class RefreshableAuthProvider implements IAuthProvider {
 *   private accessToken: string;
 *   private refreshToken: string;
 *   private tokenExpiry: Date;
 *
 *   async getAuthHeaders() {
 *     if (this.isTokenExpired()) {
 *       await this.refreshAccessToken();
 *     }
 *     return { Authorization: `Bearer ${this.accessToken}` };
 *   }
 *
 *   async handleAuthError(error) {
 *     if (error.response?.status === 401) {
 *       try {
 *         await this.refreshAccessToken();
 *         return true; // Retry the request
 *       } catch (refreshError) {
 *         // Refresh failed, perhaps redirect to login
 *         throw new Error('Authentication failed. Please log in again.');
 *       }
 *     }
 *     return false; // Not an auth error we can handle
 *   }
 *
 *   private async refreshAccessToken() {
 *     // Implementation specific token refresh logic
 *   }
 * }
 * ```
 */

import { AxiosError } from "axios";
import { IAuthProvider } from "../types";

/**
 * Static authentication provider for backward compatibility
 * Uses fixed headers that don't change during execution
 */
export class StaticAuthProvider implements IAuthProvider {
  constructor(private headers: Record<string, string>) {
    // Create defensive copy to prevent external modifications
    this.headers = { ...headers };
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return { ...this.headers };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    // Static providers can't handle auth errors - no retry
    return false;
  }
}

/**
 * Check if an error is an authentication-related error
 * @param error - The error to check
 * @returns true if the error is authentication-related (401, 403)
 */
export function isAuthError(error: AxiosError): boolean {
  return error.response?.status === 401 || error.response?.status === 403;
}

export default StaticAuthProvider;
