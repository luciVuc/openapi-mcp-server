/**
 * Test suite for Authentication Module Index
 *
 * Tests the auth module exports and ensures proper module structure:
 * - Named exports (StaticAuthProvider, isAuthError)
 * - Default export (StaticAuthProvider)
 * - Export consistency and integrity
 */

import authModule, { StaticAuthProvider, isAuthError } from "../../src/auth";
import { IAuthProvider } from "../../src/types/auth";

describe("Authentication Index Module", () => {
  describe("named exports", () => {
    it("should export StaticAuthProvider as named export", () => {
      expect(StaticAuthProvider).toBeDefined();
      expect(typeof StaticAuthProvider).toBe("function");
      expect(StaticAuthProvider.prototype.constructor).toBe(StaticAuthProvider);
    });

    it("should export isAuthError as named export", () => {
      expect(isAuthError).toBeDefined();
      expect(typeof isAuthError).toBe("function");
    });

    it("should have StaticAuthProvider that implements IAuthProvider", () => {
      const provider = new StaticAuthProvider({});

      // Type check - should have required interface methods
      expect(typeof provider.getAuthHeaders).toBe("function");
      expect(typeof provider.handleAuthError).toBe("function");
    });
  });

  describe("default export", () => {
    it("should export StaticAuthProvider as default export", () => {
      expect(authModule).toBeDefined();
      expect(typeof authModule).toBe("function");
      expect(authModule).toBe(StaticAuthProvider);
    });

    it("should allow creating instances from default export", () => {
      const headers = { Authorization: "Bearer test-token" };
      const provider = new authModule(headers);

      expect(provider).toBeInstanceOf(StaticAuthProvider);
      expect(provider).toBeInstanceOf(authModule);
    });

    it("should have same constructor behavior as named export", () => {
      const headers = { "X-API-Key": "test-key" };

      const namedInstance = new StaticAuthProvider(headers);
      const defaultInstance = new authModule(headers);

      expect(namedInstance.constructor).toBe(defaultInstance.constructor);
      expect(namedInstance).toBeInstanceOf(StaticAuthProvider);
      expect(defaultInstance).toBeInstanceOf(StaticAuthProvider);
    });
  });

  describe("export consistency", () => {
    it("should have consistent StaticAuthProvider exports", () => {
      // Named and default exports should be the same constructor
      expect(StaticAuthProvider).toBe(authModule);
    });

    it("should maintain prototype consistency", () => {
      const headers = { Authorization: "Bearer token" };

      const fromNamed = new StaticAuthProvider(headers);
      const fromDefault = new authModule(headers);

      expect(Object.getPrototypeOf(fromNamed)).toBe(
        Object.getPrototypeOf(fromDefault),
      );
      expect(fromNamed.constructor).toBe(fromDefault.constructor);
    });

    it("should have consistent method availability", async () => {
      const headers = { "X-API-Key": "key123" };

      const namedProvider = new StaticAuthProvider(headers);
      const defaultProvider = new authModule(headers);

      // Both should have the same methods
      expect(typeof namedProvider.getAuthHeaders).toBe("function");
      expect(typeof namedProvider.handleAuthError).toBe("function");
      expect(typeof defaultProvider.getAuthHeaders).toBe("function");
      expect(typeof defaultProvider.handleAuthError).toBe("function");

      // Methods should work identically
      const namedHeaders = await namedProvider.getAuthHeaders();
      const defaultHeaders = await defaultProvider.getAuthHeaders();

      expect(namedHeaders).toEqual(defaultHeaders);
      expect(namedHeaders).toEqual(headers);
    });
  });

  describe("functional verification", () => {
    it("should create working StaticAuthProvider instances from exports", async () => {
      const testHeaders = {
        Authorization: "Bearer test-token",
        "X-Client-ID": "client-123",
      };

      // Test named export functionality
      const namedProvider = new StaticAuthProvider(testHeaders);
      const namedResult = await namedProvider.getAuthHeaders();

      expect(namedResult).toEqual(testHeaders);
      expect(namedResult).not.toBe(testHeaders); // Should be a copy

      // Test default export functionality
      const defaultProvider = new authModule(testHeaders);
      const defaultResult = await defaultProvider.getAuthHeaders();

      expect(defaultResult).toEqual(testHeaders);
      expect(defaultResult).not.toBe(testHeaders); // Should be a copy
    });

    it("should have working isAuthError function", () => {
      // Test with mock AxiosError objects
      const authError = {
        response: { status: 401 },
      } as any;

      const nonAuthError = {
        response: { status: 500 },
      } as any;

      const noResponseError = {} as any;

      expect(isAuthError(authError)).toBe(true);
      expect(isAuthError(nonAuthError)).toBe(false);
      expect(isAuthError(noResponseError)).toBe(false);
    });

    it("should handle error scenarios in exported functions", async () => {
      const provider = new StaticAuthProvider({
        Authorization: "Bearer token",
      });

      const mockError = {
        response: { status: 401, statusText: "Unauthorized" },
      } as any;

      // handleAuthError should return false for static provider
      const shouldRetry = await provider.handleAuthError(mockError);
      expect(shouldRetry).toBe(false);

      // isAuthError should detect this as auth error
      expect(isAuthError(mockError)).toBe(true);
    });
  });

  describe("integration with module system", () => {
    it("should support destructuring imports", () => {
      // This test ensures the destructuring import in the test file works
      expect(StaticAuthProvider).toBeDefined();
      expect(isAuthError).toBeDefined();
      expect(authModule).toBeDefined();
    });

    it("should support mixed import styles", () => {
      // Verify we can use both default and named imports together
      const headers = { "X-Test": "value" };

      const instance1 = new StaticAuthProvider(headers);
      const instance2 = new authModule(headers);

      expect(instance1).toBeInstanceOf(StaticAuthProvider);
      expect(instance2).toBeInstanceOf(StaticAuthProvider);
      expect(instance1.constructor).toBe(instance2.constructor);
    });

    it("should maintain TypeScript type compatibility", () => {
      // Verify that both exports work with TypeScript types
      const headers = { Authorization: "Bearer token" };

      const namedProvider: IAuthProvider = new StaticAuthProvider(headers);
      const defaultProvider: IAuthProvider = new authModule(headers);

      expect(namedProvider).toBeInstanceOf(StaticAuthProvider);
      expect(defaultProvider).toBeInstanceOf(StaticAuthProvider);
    });
  });

  describe("edge cases and robustness", () => {
    it("should handle empty module instantiation", () => {
      const emptyProvider = new StaticAuthProvider({});
      const emptyDefaultProvider = new authModule({});

      expect(emptyProvider).toBeInstanceOf(StaticAuthProvider);
      expect(emptyDefaultProvider).toBeInstanceOf(StaticAuthProvider);
    });

    it("should handle complex header configurations", async () => {
      const complexHeaders = {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "X-API-Key": "sk-1234567890abcdef",
        "X-Client-Version": "2.1.0",
        "X-Request-ID": "req-" + Date.now(),
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      const namedProvider = new StaticAuthProvider(complexHeaders);
      const defaultProvider = new authModule(complexHeaders);

      const namedHeaders = await namedProvider.getAuthHeaders();
      const defaultHeaders = await defaultProvider.getAuthHeaders();

      expect(namedHeaders).toEqual(complexHeaders);
      expect(defaultHeaders).toEqual(complexHeaders);
      expect(namedHeaders).toEqual(defaultHeaders);
    });

    it("should maintain reference independence", async () => {
      const originalHeaders: Record<string, string> = {
        Authorization: "Bearer token",
      };

      const provider1 = new StaticAuthProvider(originalHeaders);
      const provider2 = new authModule(originalHeaders);

      // Modify original headers
      originalHeaders["X-Modified"] = "modified";

      // Providers should not be affected
      const headers1 = await provider1.getAuthHeaders();
      const headers2 = await provider2.getAuthHeaders();

      expect(headers1).not.toHaveProperty("X-Modified");
      expect(headers2).not.toHaveProperty("X-Modified");
      expect(headers1).toEqual({ Authorization: "Bearer token" });
      expect(headers2).toEqual({ Authorization: "Bearer token" });
    });
  });

  describe("module metadata", () => {
    it("should have proper constructor names", () => {
      expect(StaticAuthProvider.name).toBe("StaticAuthProvider");
      expect(authModule.name).toBe("StaticAuthProvider");
    });

    it("should support instanceof checks", () => {
      const provider = new StaticAuthProvider({});

      expect(provider instanceof StaticAuthProvider).toBe(true);
      expect(provider instanceof authModule).toBe(true);
    });

    it("should have consistent function properties", () => {
      expect(StaticAuthProvider.length).toBe(authModule.length); // Constructor arity
      expect(StaticAuthProvider.prototype).toBe(authModule.prototype);
    });
  });
});
