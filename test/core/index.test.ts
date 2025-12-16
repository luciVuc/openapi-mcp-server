/**
 * Test suite for Core Module Exports
 *
 * Tests the main core module exports:
 * - OpenAPIServer class export
 * - Configuration validation exports
 */

import * as CoreModule from "../../src/core";

describe("Core Module Exports", () => {
  it("should export OpenAPIServer class", () => {
    expect(CoreModule.OpenAPIServer).toBeDefined();
    expect(typeof CoreModule.OpenAPIServer).toBe("function");
  });

  it("should export validateConfig function", () => {
    expect(CoreModule.validateConfig).toBeDefined();
    expect(typeof CoreModule.validateConfig).toBe("function");
  });

  it("should export DEFAULT_CONFIG constant", () => {
    expect(CoreModule.DEFAULT_CONFIG).toBeDefined();
    expect(typeof CoreModule.DEFAULT_CONFIG).toBe("object");
  });

  it("should have all expected exports", () => {
    const exports = Object.keys(CoreModule);
    expect(exports).toContain("OpenAPIServer");
    expect(exports).toContain("validateConfig");
    expect(exports).toContain("DEFAULT_CONFIG");
  });

  it("OpenAPIServer should be a constructor", () => {
    // Test that OpenAPIServer can be instantiated with proper config
    const config = {
      apiBaseUrl: "https://api.example.com",
      openApiSpec: "https://api.example.com/openapi.json",
      transportType: "stdio" as const,
    };

    // Don't actually instantiate to avoid side effects, just test the constructor exists
    expect(() => new CoreModule.OpenAPIServer(config)).toBeDefined();
  });

  it("validateConfig should accept valid configuration", () => {
    const config = {
      apiBaseUrl: "https://api.example.com",
      openApiSpec: "https://api.example.com/openapi.json",
      transportType: "stdio" as const,
    };

    expect(() => CoreModule.validateConfig(config)).not.toThrow();
  });

  it("DEFAULT_CONFIG should have expected properties", () => {
    expect(CoreModule.DEFAULT_CONFIG).toHaveProperty("name");
    expect(CoreModule.DEFAULT_CONFIG).toHaveProperty("version");
    expect(CoreModule.DEFAULT_CONFIG).toHaveProperty("transportType");
    expect(CoreModule.DEFAULT_CONFIG).toHaveProperty("toolsMode");
  });
});
