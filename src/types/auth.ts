import { AxiosError } from "axios";

/**
 * Interface for dynamic authentication providers
 * Enables token refresh and dynamic header generation
 */
export interface IAuthProvider {
  /**
   * Get authentication headers for the current request
   * This method is called before each API request to get fresh headers
   *
   * @returns Promise that resolves to headers object
   * @throws Error if authentication is not available (e.g., token expired)
   */
  getAuthHeaders(): Promise<Record<string, string>>;

  /**
   * Handle authentication errors from API responses
   * This is called when the API returns authentication-related errors (401, 403)
   *
   * @param error - The axios error from the failed request
   * @returns Promise that resolves to true if the request should be retried, false otherwise
   */
  handleAuthError(error: AxiosError): Promise<boolean>;
}
