/**
 * Test suite for Authentication Providers
 *
 * Tests the authentication system including:
 * - StaticAuthProvider for backward compatibility
 * - isAuthError function for authentication error detection
 * - IAuthProvider interface compliance
 */

import { AxiosError } from "axios";
import { StaticAuthProvider, isAuthError } from "../../src/auth/providers";
import { IAuthProvider } from "../../src/types/auth";

describe("Authentication Providers", () => {
  describe("StaticAuthProvider", () => {
    describe("constructor", () => {
      it("should create instance with provided headers", () => {
        const headers = {
          Authorization: "Bearer token",
          "X-API-Key": "key123",
        };
        const provider = new StaticAuthProvider(headers);

        expect(provider).toBeInstanceOf(StaticAuthProvider);
      });

      it("should create instance with empty headers", () => {
        const provider = new StaticAuthProvider({});

        expect(provider).toBeInstanceOf(StaticAuthProvider);
      });

      it("should implement IAuthProvider interface", () => {
        const headers = { Authorization: "Bearer token" };
        const provider = new StaticAuthProvider(headers);

        // Type check - should have required methods
        expect(typeof provider.getAuthHeaders).toBe("function");
        expect(typeof provider.handleAuthError).toBe("function");

        // Runtime check - should be instance of correct type
        expect(provider).toBeInstanceOf(StaticAuthProvider);
      });
    });

    describe("getAuthHeaders", () => {
      it("should return copy of provided headers", async () => {
        const headers = {
          Authorization: "Bearer token",
          "X-API-Key": "key123",
        };
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toEqual(headers);
        expect(result).not.toBe(headers); // Should be a copy, not reference
      });

      it("should return empty object when no headers provided", async () => {
        const provider = new StaticAuthProvider({});

        const result = await provider.getAuthHeaders();

        expect(result).toEqual({});
      });

      it("should handle complex header structures", async () => {
        const headers = {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "X-API-Key": "api-key-12345",
          "X-Client-Version": "1.0.0",
          "X-Custom-Header": "custom-value",
          "Content-Type": "application/json",
        };
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toEqual(headers);
      });

      it("should preserve header values exactly", async () => {
        const headers = {
          Authorization: "Bearer token-with-special-chars!@#$%^&*()",
          "X-Unicode": "测试中文字符",
          "X-Encoded": "encoded%20value",
          "X-Empty": "",
        };
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toEqual(headers);
      });

      it("should return consistent results on multiple calls", async () => {
        const headers = { Authorization: "Bearer token" };
        const provider = new StaticAuthProvider(headers);

        const result1 = await provider.getAuthHeaders();
        const result2 = await provider.getAuthHeaders();
        const result3 = await provider.getAuthHeaders();

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
        expect(result1).toEqual(headers);
      });

      it("should not be affected by external modifications", async () => {
        const headers: Record<string, string> = {
          Authorization: "Bearer token",
        };
        const provider = new StaticAuthProvider(headers);

        // Get headers before modification
        const resultBefore = await provider.getAuthHeaders();

        // Modify original headers object
        headers["X-Modified"] = "modified";

        // Get headers after modification
        const resultAfter = await provider.getAuthHeaders();

        // Both results should be the same (unaffected by external modification)
        expect(resultBefore).toEqual({ Authorization: "Bearer token" });
        expect(resultAfter).toEqual({ Authorization: "Bearer token" });
        expect(resultAfter).not.toHaveProperty("X-Modified");
      });
    });

    describe("handleAuthError", () => {
      it("should always return false for any error", async () => {
        const provider = new StaticAuthProvider({
          Authorization: "Bearer token",
        });

        const error401 = createAxiosError(401, "Unauthorized");
        const error403 = createAxiosError(403, "Forbidden");
        const error500 = createAxiosError(500, "Internal Server Error");

        expect(await provider.handleAuthError(error401)).toBe(false);
        expect(await provider.handleAuthError(error403)).toBe(false);
        expect(await provider.handleAuthError(error500)).toBe(false);
      });

      it("should return false for auth errors without retry capability", async () => {
        const provider = new StaticAuthProvider({ "X-API-Key": "key123" });

        const authError = createAxiosError(401, "Token expired");

        const result = await provider.handleAuthError(authError);

        expect(result).toBe(false);
      });

      it("should handle network errors", async () => {
        const provider = new StaticAuthProvider({});

        const networkError = new AxiosError("Network Error");
        networkError.code = "ECONNREFUSED";

        const result = await provider.handleAuthError(networkError);

        expect(result).toBe(false);
      });

      it("should handle malformed errors gracefully", async () => {
        const provider = new StaticAuthProvider({
          Authorization: "Bearer token",
        });

        const malformedError = new AxiosError("Unknown error");

        const result = await provider.handleAuthError(malformedError);

        expect(result).toBe(false);
      });
    });

    describe("interface compliance", () => {
      it("should fully implement IAuthProvider interface", () => {
        const provider = new StaticAuthProvider({
          Authorization: "Bearer token",
        });

        // Check that provider implements all required methods
        const interfaceMethods: (keyof IAuthProvider)[] = [
          "getAuthHeaders",
          "handleAuthError",
        ];

        interfaceMethods.forEach((method) => {
          expect(typeof provider[method]).toBe("function");
        });
      });

      it("should return Promise from getAuthHeaders", () => {
        const provider = new StaticAuthProvider({});

        const result = provider.getAuthHeaders();

        expect(result).toBeInstanceOf(Promise);
      });

      it("should return Promise from handleAuthError", () => {
        const provider = new StaticAuthProvider({});
        const error = createAxiosError(401, "Unauthorized");

        const result = provider.handleAuthError(error);

        expect(result).toBeInstanceOf(Promise);
      });
    });

    describe("edge cases", () => {
      it("should handle headers with undefined values", async () => {
        const headers = {
          Authorization: "Bearer token",
          "X-Undefined": undefined,
        } as any;
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toHaveProperty("X-Undefined", undefined);
      });

      it("should handle headers with null values", async () => {
        const headers = {
          Authorization: "Bearer token",
          "X-Null": null,
        } as any;
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toHaveProperty("X-Null", null);
      });

      it("should handle headers with number values", async () => {
        const headers = {
          Authorization: "Bearer token",
          "X-Number": 12345,
        } as any;
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toHaveProperty("X-Number", 12345);
      });

      it("should handle very long header values", async () => {
        const longValue = "x".repeat(10000);
        const headers = { Authorization: `Bearer ${longValue}` };
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result["Authorization"]).toBe(`Bearer ${longValue}`);
      });

      it("should handle headers with special characters in names", async () => {
        const headers = { "X-Special-Header_123": "value" };
        const provider = new StaticAuthProvider(headers);

        const result = await provider.getAuthHeaders();

        expect(result).toEqual(headers);
      });
    });
  });

  describe("isAuthError", () => {
    describe("authentication error detection", () => {
      it("should return true for 401 Unauthorized", () => {
        const error = createAxiosError(401, "Unauthorized");

        expect(isAuthError(error)).toBe(true);
      });

      it("should return true for 403 Forbidden", () => {
        const error = createAxiosError(403, "Forbidden");

        expect(isAuthError(error)).toBe(true);
      });

      it("should return false for other HTTP error codes", () => {
        const testCases = [
          { status: 400, message: "Bad Request" },
          { status: 404, message: "Not Found" },
          { status: 422, message: "Unprocessable Entity" },
          { status: 500, message: "Internal Server Error" },
          { status: 502, message: "Bad Gateway" },
          { status: 503, message: "Service Unavailable" },
        ];

        testCases.forEach(({ status, message }) => {
          const error = createAxiosError(status, message);
          expect(isAuthError(error)).toBe(false);
        });
      });

      it("should return false for successful status codes", () => {
        const successCases = [200, 201, 204, 301, 302];

        successCases.forEach((status) => {
          const error = createAxiosError(status, "Success");
          expect(isAuthError(error)).toBe(false);
        });
      });
    });

    describe("edge cases", () => {
      it("should return false when error has no response", () => {
        const error = new AxiosError("Network Error");
        error.response = undefined;

        expect(isAuthError(error)).toBe(false);
      });

      it("should return false when response has no status", () => {
        const error = new AxiosError("Unknown Error");
        error.response = { status: undefined } as any;

        expect(isAuthError(error)).toBe(false);
      });

      it("should handle null response", () => {
        const error = new AxiosError("Null Response");
        error.response = null as any;

        expect(isAuthError(error)).toBe(false);
      });

      it("should handle malformed response object", () => {
        const error = new AxiosError("Malformed Response");
        error.response = { data: "invalid" } as any;

        expect(isAuthError(error)).toBe(false);
      });

      it("should handle string status codes", () => {
        const error = new AxiosError("String Status");
        error.response = { status: "401" } as any;

        expect(isAuthError(error)).toBe(false);
      });

      it("should handle NaN status codes", () => {
        const error = new AxiosError("NaN Status");
        error.response = { status: NaN } as any;

        expect(isAuthError(error)).toBe(false);
      });
    });

    describe("real-world scenarios", () => {
      it("should detect expired token errors", () => {
        const error = createAxiosError(401, "Token has expired");
        error.response!.data = {
          error: "token_expired",
          message: "JWT token has expired",
        };

        expect(isAuthError(error)).toBe(true);
      });

      it("should detect invalid API key errors", () => {
        const error = createAxiosError(403, "Invalid API key");
        error.response!.data = { error: "invalid_api_key" };

        expect(isAuthError(error)).toBe(true);
      });

      it("should detect insufficient permissions", () => {
        const error = createAxiosError(403, "Insufficient permissions");
        error.response!.data = {
          error: "access_denied",
          message: "Insufficient permissions for this resource",
        };

        expect(isAuthError(error)).toBe(true);
      });

      it("should not detect validation errors as auth errors", () => {
        const error = createAxiosError(422, "Validation failed");
        error.response!.data = {
          errors: ["Name is required", "Email is invalid"],
        };

        expect(isAuthError(error)).toBe(false);
      });

      it("should not detect rate limiting as auth error", () => {
        const error = createAxiosError(429, "Too Many Requests");
        error.response!.data = { error: "rate_limit_exceeded" };

        expect(isAuthError(error)).toBe(false);
      });
    });
  });

  describe("integration scenarios", () => {
    describe("StaticAuthProvider with isAuthError", () => {
      it("should consistently handle auth errors", async () => {
        const provider = new StaticAuthProvider({
          Authorization: "Bearer expired-token",
        });

        // Simulate auth error scenario
        const authError = createAxiosError(401, "Token expired");

        // Provider should not retry
        const shouldRetry = await provider.handleAuthError(authError);
        expect(shouldRetry).toBe(false);

        // Error should be detected as auth error
        expect(isAuthError(authError)).toBe(true);
      });

      it("should handle non-auth errors consistently", async () => {
        const provider = new StaticAuthProvider({ "X-API-Key": "valid-key" });

        // Simulate non-auth error
        const serverError = createAxiosError(500, "Internal Server Error");

        // Provider should not retry
        const shouldRetry = await provider.handleAuthError(serverError);
        expect(shouldRetry).toBe(false);

        // Error should not be detected as auth error
        expect(isAuthError(serverError)).toBe(false);
      });
    });

    describe("multiple providers scenario", () => {
      it("should work with different header configurations", async () => {
        const bearerProvider = new StaticAuthProvider({
          Authorization: "Bearer token123",
        });
        const apiKeyProvider = new StaticAuthProvider({
          "X-API-Key": "key456",
        });
        const combinedProvider = new StaticAuthProvider({
          Authorization: "Bearer token789",
          "X-API-Key": "key789",
          "X-Client-ID": "client123",
        });

        const bearerHeaders = await bearerProvider.getAuthHeaders();
        const apiKeyHeaders = await apiKeyProvider.getAuthHeaders();
        const combinedHeaders = await combinedProvider.getAuthHeaders();

        expect(bearerHeaders).toEqual({ Authorization: "Bearer token123" });
        expect(apiKeyHeaders).toEqual({ "X-API-Key": "key456" });
        expect(combinedHeaders).toEqual({
          Authorization: "Bearer token789",
          "X-API-Key": "key789",
          "X-Client-ID": "client123",
        });
      });
    });

    describe("error handling patterns", () => {
      it("should demonstrate typical auth error flow", async () => {
        const provider = new StaticAuthProvider({
          Authorization: "Bearer invalid-token",
        });

        // Step 1: Get headers for request
        const headers = await provider.getAuthHeaders();
        expect(headers).toEqual({ Authorization: "Bearer invalid-token" });

        // Step 2: Simulate API call failure
        const authError = createAxiosError(401, "Invalid token");

        // Step 3: Check if it's an auth error
        expect(isAuthError(authError)).toBe(true);

        // Step 4: Try to handle the error
        const shouldRetry = await provider.handleAuthError(authError);
        expect(shouldRetry).toBe(false); // Static provider cannot retry
      });
    });
  });
});

// Helper function to create AxiosError instances for testing
function createAxiosError(status: number, message: string): AxiosError {
  const error = new AxiosError(message);
  error.response = {
    status,
    statusText: message,
    data: { error: message },
    headers: {},
    config: {} as any,
  };
  return error;
}
