/**
 * API client for making authenticated HTTP requests to OpenAPI endpoints
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { StaticAuthProvider, isAuthError } from "../auth/providers";
import { parseToolId } from "../tools/utils/id-generator";
import { logger } from "../utils/logger";
import { IApiCallParams, IApiCallResult, IAuthProvider } from "../types";

/**
 * HTTP client for executing API calls with authentication
 */
export class ApiClient {
  private axios: AxiosInstance;
  private authProvider: IAuthProvider;
  private baseUrl: string;

  constructor(
    baseUrl: string,
    authProvider?: IAuthProvider,
    headers?: Record<string, string>,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash

    // Choose authentication method
    if (authProvider) {
      this.authProvider = authProvider;
    } else if (headers) {
      this.authProvider = new StaticAuthProvider(headers);
    } else {
      this.authProvider = new StaticAuthProvider({});
    }

    // Create axios instance
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on HTTP error status codes
    });

    // Add request interceptor for authentication
    this.axios.interceptors.request.use(async (config) => {
      try {
        const authHeaders = await this.authProvider.getAuthHeaders();
        Object.assign(config.headers, authHeaders);
      } catch (error) {
        logger.error(
          `Failed to get auth headers: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        throw error;
      }
      return config;
    });

    logger.debug(`Created API client for base URL: ${this.baseUrl}`);
  }

  /**
   * Execute an API call
   */
  async executeApiCall({
    headers,
    parameters,
    toolId,
  }: IApiCallParams): Promise<IApiCallResult> {
    try {
      logger.debug(`Executing API call: ${toolId}`);

      const { method, path } = parseToolId(toolId);
      const { requestConfig } = this.buildRequestConfig(
        method,
        path,
        parameters,
        headers,
      );

      let response: AxiosResponse;
      let retryAttempted = false;

      try {
        response = await this.axios.request(requestConfig);
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          isAuthError(error) &&
          !retryAttempted
        ) {
          logger.debug("Authentication error detected, attempting recovery");

          try {
            const shouldRetry = await this.authProvider.handleAuthError(error);
            if (shouldRetry) {
              retryAttempted = true;
              logger.debug("Retrying request with fresh authentication");
              response = await this.axios.request(requestConfig);
            } else {
              return this.createErrorResult(error);
            }
          } catch (authError) {
            return {
              success: false,
              error:
                authError instanceof Error
                  ? authError.message
                  : "Authentication failed",
              statusCode: error.response?.status,
            };
          }
        } else {
          return this.createErrorResult(error);
        }
      }

      // Process successful response
      return this.createSuccessResult(response);
    } catch (error) {
      logger.error(
        `API call failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Build request configuration from parameters
   */
  private buildRequestConfig(
    method: string,
    path: string,
    parameters: Record<string, any>,
    headers?: Record<string, string>,
  ): {
    url: string;
    requestConfig: AxiosRequestConfig;
  } {
    const pathParams: Record<string, any> = {};
    const queryParams: Record<string, any> = {};
    const headerParams: Record<string, any> = { ...headers };
    const cookieParams: Record<string, any> = {};
    let bodyData: any = null;

    // Separate parameters by location
    for (const [key, value] of Object.entries(parameters)) {
      if (value === undefined || value === null) {
        continue;
      }

      // Check if this parameter has location metadata
      const paramSchema = this.getParameterSchema(key, parameters);
      const location = paramSchema?.["x-parameter-location"];

      switch (location) {
        /* istanbul ignore next */
        case "path":
          pathParams[key] = value;
          break;
        /* istanbul ignore next */
        case "query":
          queryParams[key] = value;
          break;
        /* istanbul ignore next */
        case "header":
          headerParams[key] = value;
          break;
        /* istanbul ignore next */
        case "cookie":
          cookieParams[key] = value;
          break;
        default:
          // If no location specified, treat as body data
          if (key === "body") {
            bodyData = value;
          } else {
            // For parameters without explicit location, infer from context
            if (path.includes(`{${key}}`)) {
              pathParams[key] = value;
            } else {
              queryParams[key] = value;
            }
          }
          break;
      }
    }

    // Replace path parameters in URL
    let finalPath = path;
    for (const [key, value] of Object.entries(pathParams)) {
      finalPath = finalPath.replace(
        `{${key}}`,
        encodeURIComponent(String(value)),
      );
    }

    // Build request configuration
    const requestConfig: AxiosRequestConfig = {
      method: method.toLowerCase() as any,
      url: finalPath,
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      headers: Object.keys(headerParams).length > 0 ? headerParams : undefined,
    };

    // Add body data for appropriate methods
    if (
      ["POST", "PUT", "PATCH"].includes(method.toUpperCase()) &&
      bodyData !== null
    ) {
      requestConfig.data = bodyData;

      // Set content type if not already specified
      if (
        !requestConfig.headers?.["Content-Type"] &&
        !requestConfig.headers?.["content-type"]
      ) {
        requestConfig.headers = {
          ...requestConfig.headers,
          "Content-Type": "application/json",
        };
      }
    }

    // Handle cookies
    if (Object.keys(cookieParams).length > 0) {
      const cookieString = Object.entries(cookieParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join("; ");

      requestConfig.headers = {
        ...requestConfig.headers,
        Cookie: cookieString,
      };
    }

    const fullUrl = this.baseUrl + finalPath;
    logger.debug(`Built request: ${method.toUpperCase()} ${fullUrl}`);

    return { url: fullUrl, requestConfig };
  }

  /**
   * Get parameter schema (simplified version - in real implementation,
   * this would come from the OpenAPI spec)
   */
  private getParameterSchema(
    paramName: string,
    parameters: Record<string, any>,
  ): any {
    // This is a simplified implementation
    // In practice, this would reference the OpenAPI spec to get parameter metadata
    return null;
  }

  /**
   * Create success result from response
   */
  private createSuccessResult(response: AxiosResponse): IApiCallResult {
    const result: IApiCallResult = {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      statusCode: response.status,
      headers: {},
    };

    // Convert headers to plain object
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === "string") {
          result.headers![key] = value;
        }
      }
    }

    // If status indicates error, treat as error result
    if (!result.success) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      if (response.data && typeof response.data === "object") {
        if (response.data.message) {
          result.error += ` - ${response.data.message}`;
        } else if (response.data.error) {
          result.error += ` - ${response.data.error}`;
        }
      }
    }

    return result;
  }

  /**
   * Create error result from exception
   */
  private createErrorResult(error: any): IApiCallResult {
    if (axios.isAxiosError(error)) {
      const result: IApiCallResult = {
        success: false,
        statusCode: error.response?.status,
        error: error.message,
      };

      if (error.response?.data) {
        result.data = error.response.data;

        // Try to extract error message from response
        if (typeof error.response.data === "object") {
          if (error.response.data.message) {
            result.error = error.response.data.message;
          } else if (error.response.data.error) {
            result.error = error.response.data.error;
          }
        }
      }

      return result;
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }

  /**
   * Test the connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axios.get("/");
      return response.status < 500; // Accept any status < 500 as "reachable"
    } catch (error) {
      logger.debug(
        `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }
}

export default ApiClient;
