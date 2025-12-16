/**
 * Tests for tool ID generator utilities
 */

import {
  generateToolId,
  parseToolId,
  sanitizeForToolId,
  extractResourceName,
  isValidToolId,
  isValidHttpMethod,
  HTTP_METHODS,
} from "../../../src/tools/utils/id-generator";

describe("Tool ID Generator", () => {
  describe("generateToolId", () => {
    it("should generate basic tool IDs correctly", () => {
      expect(generateToolId("GET", "/users")).toBe("GET::users");
      expect(generateToolId("POST", "/users")).toBe("POST::users");
      expect(generateToolId("get", "/users")).toBe("GET::users"); // should uppercase method
    });

    it("should handle paths with parameters", () => {
      expect(generateToolId("GET", "/users/{id}")).toBe("GET::users__---id");
      expect(generateToolId("PUT", "/users/{userId}/posts/{postId}")).toBe(
        "PUT::users__---userId__posts__---postId",
      );
    });

    it("should handle complex nested paths", () => {
      expect(generateToolId("GET", "/api/v1/users/{id}/posts")).toBe(
        "GET::api__v1__users__---id__posts",
      );
      expect(
        generateToolId(
          "DELETE",
          "/organizations/{orgId}/teams/{teamId}/members/{memberId}",
        ),
      ).toBe(
        "DELETE::organizations__---orgId__teams__---teamId__members__---memberId",
      );
    });

    it("should handle paths with leading/trailing slashes", () => {
      expect(generateToolId("GET", "/users/")).toBe("GET::users");
      expect(generateToolId("GET", "users")).toBe("GET::users");
      expect(generateToolId("GET", "///users///")).toBe("GET::users");
    });

    it("should handle empty or root paths", () => {
      expect(generateToolId("GET", "/")).toBe("GET::");
      expect(generateToolId("GET", "")).toBe("GET::");
    });

    it("should sanitize special characters in paths", () => {
      expect(generateToolId("GET", "/user-profiles")).toBe(
        "GET::user-profiles",
      );
      expect(generateToolId("GET", "/users@domain.com")).toBe(
        "GET::usersdomaincom",
      );
      expect(generateToolId("GET", "/users with spaces")).toBe(
        "GET::userswithspaces",
      );
    });
  });

  describe("parseToolId", () => {
    it("should parse basic tool IDs correctly", () => {
      expect(parseToolId("GET::users")).toEqual({
        method: "GET",
        path: "/users",
      });
      expect(parseToolId("POST::users")).toEqual({
        method: "POST",
        path: "/users",
      });
    });

    it("should parse tool IDs with parameters", () => {
      expect(parseToolId("GET::users__---id")).toEqual({
        method: "GET",
        path: "/users/{id}",
      });
      expect(parseToolId("PUT::users__---userId__posts__---postId")).toEqual({
        method: "PUT",
        path: "/users/{userId}/posts/{postId}",
      });
    });

    it("should parse complex nested paths", () => {
      expect(parseToolId("GET::api__v1__users__---id__posts")).toEqual({
        method: "GET",
        path: "/api/v1/users/{id}/posts",
      });
    });

    it("should handle lowercase methods and convert to uppercase", () => {
      expect(parseToolId("get::users")).toEqual({
        method: "GET",
        path: "/users",
      });
      expect(parseToolId("post::users")).toEqual({
        method: "POST",
        path: "/users",
      });
    });

    it("should throw error for invalid tool ID formats", () => {
      expect(() => parseToolId("invalid")).toThrow(
        "Invalid tool ID format: invalid",
      );
      expect(() => parseToolId("GET")).toThrow("Invalid tool ID format: GET");
      expect(() => parseToolId("::users")).toThrow(
        "Invalid tool ID format: ::users",
      );
      expect(() => parseToolId("GET::")).toThrow(
        "Invalid tool ID format: GET::",
      ); // Empty pathPart is invalid
    });

    it("should handle multiple colons in tool ID", () => {
      // The split("::", 2) limits to 2 parts, so the rest gets truncated
      expect(parseToolId("GET::users::extra::parts")).toEqual({
        method: "GET",
        path: "/users", // Only takes the first part after "::"
      });
    });
  });

  describe("sanitizeForToolId", () => {
    it("should keep allowed characters", () => {
      expect(sanitizeForToolId("valid_ID-123")).toBe("valid_ID-123");
      expect(sanitizeForToolId("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toBe(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      );
      expect(sanitizeForToolId("abcdefghijklmnopqrstuvwxyz")).toBe(
        "abcdefghijklmnopqrstuvwxyz",
      );
      expect(sanitizeForToolId("0123456789")).toBe("0123456789");
    });

    it("should remove disallowed characters", () => {
      expect(sanitizeForToolId("hello@world.com")).toBe("helloworldcom");
      expect(sanitizeForToolId("user name with spaces")).toBe(
        "usernamewithspaces",
      );
      expect(sanitizeForToolId("special!@#$%^&*()characters")).toBe(
        "specialcharacters",
      );
    });

    it("should collapse multiple underscores", () => {
      expect(sanitizeForToolId("path___with____many_____underscores")).toBe(
        "path__with__many__underscores",
      );
      expect(sanitizeForToolId("___multiple___at___start___")).toBe(
        "multiple__at__start",
      );
    });

    it("should trim leading and trailing underscores/hyphens", () => {
      expect(sanitizeForToolId("_-_trimmed_-_")).toBe("trimmed");
      expect(sanitizeForToolId("---leading-hyphens")).toBe("leading-hyphens");
      expect(sanitizeForToolId("trailing-underscores___")).toBe(
        "trailing-underscores",
      );
    });

    it("should handle empty or whitespace-only input", () => {
      expect(sanitizeForToolId("")).toBe("");
      expect(sanitizeForToolId("   ")).toBe("");
      expect(sanitizeForToolId("!@#$%^&*()")).toBe("");
    });
  });

  describe("extractResourceName", () => {
    it("should extract simple resource names", () => {
      expect(extractResourceName("/users")).toBe("users");
      expect(extractResourceName("/posts")).toBe("posts");
      expect(extractResourceName("/organizations")).toBe("organizations");
    });

    it("should extract from paths with parameters", () => {
      expect(extractResourceName("/users/{id}")).toBe("users");
      expect(extractResourceName("/posts/{postId}/comments")).toBe("comments");
      expect(extractResourceName("/users/{userId}/posts/{postId}")).toBe(
        "posts",
      );
    });

    it("should skip common API path segments", () => {
      expect(extractResourceName("/api/users")).toBe("users");
      expect(extractResourceName("/api/v1/users")).toBe("users");
      expect(extractResourceName("/api/v2/posts")).toBe("posts");
      expect(extractResourceName("/v3/organizations")).toBe("organizations");
    });

    it("should handle complex nested paths", () => {
      expect(
        extractResourceName(
          "/api/v1/organizations/{id}/teams/{teamId}/members",
        ),
      ).toBe("members");
      expect(
        extractResourceName(
          "/api/v2/users/{userId}/posts/{postId}/comments/{commentId}",
        ),
      ).toBe("comments");
    });

    it("should return first segment when no meaningful segment found", () => {
      expect(extractResourceName("/api/v1")).toBe("api");
      expect(extractResourceName("/v2/{id}")).toBe("v2");
    });

    it("should handle edge cases", () => {
      expect(extractResourceName("/")).toBeUndefined();
      expect(extractResourceName("")).toBeUndefined();
      expect(extractResourceName("/api/{id}/v1/{userId}")).toBe("api");
    });

    it("should normalize to lowercase", () => {
      expect(extractResourceName("/Users")).toBe("users");
      expect(extractResourceName("/POSTS")).toBe("posts");
      expect(extractResourceName("/OrGaNiZaTiOnS")).toBe("organizations");
    });
  });

  describe("isValidToolId", () => {
    it("should validate correct tool IDs", () => {
      expect(isValidToolId("GET::users")).toBe(true);
      expect(isValidToolId("POST::users__---id")).toBe(true);
      expect(isValidToolId("DELETE::api__v1__posts__---postId")).toBe(true);
    });

    it("should reject invalid tool IDs", () => {
      expect(isValidToolId("invalid")).toBe(false);
      expect(isValidToolId("GET")).toBe(false);
      expect(isValidToolId("::users")).toBe(false);
      // Note: The implementation is lenient - it parses and validates method format
      expect(isValidToolId("get::users")).toBe(true); // gets converted to uppercase
      expect(isValidToolId("123::users")).toBe(false); // regex /^[A-Z]+$/ rejects numeric methods
    });

    it("should handle empty tool ID", () => {
      expect(isValidToolId("")).toBe(false);
    });

    it("should validate method format", () => {
      expect(isValidToolId("GET::users")).toBe(true);
      expect(isValidToolId("POST::users")).toBe(true);
      expect(isValidToolId("CUSTOM::users")).toBe(true);
      // The implementation allows these due to regex pattern
      expect(isValidToolId("Get::users")).toBe(true); // mixed case passes
      expect(isValidToolId("GET1::users")).toBe(false); // alphanumeric fails regex
    });
  });

  describe("HTTP_METHODS constant", () => {
    it("should contain all standard HTTP methods", () => {
      expect(HTTP_METHODS).toContain("GET");
      expect(HTTP_METHODS).toContain("POST");
      expect(HTTP_METHODS).toContain("PUT");
      expect(HTTP_METHODS).toContain("PATCH");
      expect(HTTP_METHODS).toContain("DELETE");
      expect(HTTP_METHODS).toContain("HEAD");
      expect(HTTP_METHODS).toContain("OPTIONS");
    });

    it("should have the expected length", () => {
      expect(HTTP_METHODS).toHaveLength(7);
    });

    it("should be modifiable array", () => {
      // TypeScript arrays are mutable by default
      const originalLength = HTTP_METHODS.length;
      HTTP_METHODS.push("INVALID" as any);
      expect(HTTP_METHODS).toHaveLength(originalLength + 1);
      // Clean up
      HTTP_METHODS.pop();
      expect(HTTP_METHODS).toHaveLength(originalLength);
    });
  });

  describe("isValidHttpMethod", () => {
    it("should validate standard HTTP methods", () => {
      expect(isValidHttpMethod("GET")).toBe(true);
      expect(isValidHttpMethod("POST")).toBe(true);
      expect(isValidHttpMethod("PUT")).toBe(true);
      expect(isValidHttpMethod("PATCH")).toBe(true);
      expect(isValidHttpMethod("DELETE")).toBe(true);
      expect(isValidHttpMethod("HEAD")).toBe(true);
      expect(isValidHttpMethod("OPTIONS")).toBe(true);
    });

    it("should handle case insensitive validation", () => {
      expect(isValidHttpMethod("get")).toBe(true);
      expect(isValidHttpMethod("post")).toBe(true);
      expect(isValidHttpMethod("Put")).toBe(true);
      expect(isValidHttpMethod("PATCH")).toBe(true);
    });

    it("should reject invalid methods", () => {
      expect(isValidHttpMethod("INVALID")).toBe(false);
      expect(isValidHttpMethod("CONNECT")).toBe(false);
      expect(isValidHttpMethod("TRACE")).toBe(false);
      expect(isValidHttpMethod("")).toBe(false);
      expect(isValidHttpMethod("123")).toBe(false);
    });
  });

  describe("Integration tests", () => {
    it("should round-trip tool ID generation and parsing", () => {
      const testCases = [
        { method: "GET", path: "/users" },
        { method: "POST", path: "/users/{id}/posts" },
        { method: "PUT", path: "/api/v1/organizations/{orgId}/teams" },
        {
          method: "DELETE",
          path: "/complex/{param1}/nested/{param2}/path/{param3}",
        },
      ];

      testCases.forEach(({ method, path }) => {
        const toolId = generateToolId(method, path);
        const parsed = parseToolId(toolId);

        expect(parsed.method).toBe(method.toUpperCase());
        expect(parsed.path).toBe(path);
        expect(isValidToolId(toolId)).toBe(true);
      });
    });

    it("should handle edge case paths consistently", () => {
      const nonEmptyPaths = [
        "/api",
        "/users/",
        "///multiple///slashes///",
        "/users/{id}",
        "/api/v1/users/{userId}/posts/{postId}/comments/{commentId}",
      ];

      nonEmptyPaths.forEach((path) => {
        const toolId = generateToolId("GET", path);
        const parsed = parseToolId(toolId);

        expect(parsed.method).toBe("GET");
        expect(isValidToolId(toolId)).toBe(true);
      });

      // Empty paths result in invalid tool IDs
      const emptyPaths = ["/", ""];
      emptyPaths.forEach((path) => {
        const toolId = generateToolId("GET", path);
        expect(toolId).toBe("GET::");
        expect(() => parseToolId(toolId)).toThrow();
      });
    });
  });
});
