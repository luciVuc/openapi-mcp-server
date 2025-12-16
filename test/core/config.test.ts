/**
 * Tests for core configuration validation and defaults
 */

import { validateConfig, DEFAULT_CONFIG } from "../../src/core/config";
import { IOpenAPIServerConfig } from "../../src/types";
import { logger } from "../../src/utils/logger";
import { IAuthProvider } from "../../src/types/auth";
import { AxiosError } from "axios";

// Mock the logger to capture warnings
jest.mock("../../src/utils/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock auth provider for testing
const createMockAuthProvider = (): jest.Mocked<IAuthProvider> => ({
  getAuthHeaders: jest
    .fn()
    .mockResolvedValue({ Authorization: "Bearer mock-token" }),
  handleAuthError: jest.fn().mockResolvedValue(false),
});

describe("Core Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_CONFIG).toEqual({
        name: "openapi-mcp-server",
        version: "1.0.0",
        transportType: "stdio",
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
        toolsMode: "all",
        specInputMethod: "url",
        disableAbbreviation: false,
        debug: false,
      });
    });

    it("should be a partial config object", () => {
      // Should not include required fields like apiBaseUrl
      expect(DEFAULT_CONFIG.apiBaseUrl).toBeUndefined();
    });
  });

  describe("validateConfig", () => {
    const minimalValidConfig: IOpenAPIServerConfig = {
      apiBaseUrl: "https://api.example.com",
      openApiSpec: "https://api.example.com/openapi.json",
    };

    describe("required field validation", () => {
      it("should throw error when apiBaseUrl is missing", () => {
        const config = {
          openApiSpec: "https://api.example.com/openapi.json",
        } as IOpenAPIServerConfig;

        expect(() => validateConfig(config)).toThrow("apiBaseUrl is required");
      });

      it("should throw error when apiBaseUrl is empty string", () => {
        const config = {
          apiBaseUrl: "",
          openApiSpec: "https://api.example.com/openapi.json",
        };

        expect(() => validateConfig(config)).toThrow("apiBaseUrl is required");
      });

      it("should accept valid minimal config", () => {
        expect(() => validateConfig(minimalValidConfig)).not.toThrow();
      });
    });

    describe("OpenAPI spec validation", () => {
      it("should require openApiSpec when not using stdin or inline", () => {
        const config = {
          apiBaseUrl: "https://api.example.com",
        } as IOpenAPIServerConfig;

        expect(() => validateConfig(config)).toThrow(
          "openApiSpec is required unless using stdin or inline input method",
        );
      });

      it("should allow missing openApiSpec when using stdin", () => {
        const config = {
          apiBaseUrl: "https://api.example.com",
          specInputMethod: "stdin",
        } as IOpenAPIServerConfig;

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should allow missing openApiSpec when using inline", () => {
        const config = {
          apiBaseUrl: "https://api.example.com",
          specInputMethod: "inline",
        } as IOpenAPIServerConfig;

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should allow openApiSpec with explicit methods", () => {
        const configs = [
          {
            ...minimalValidConfig,
            specInputMethod: "url" as const,
          },
          {
            ...minimalValidConfig,
            specInputMethod: "file" as const,
          },
        ];

        configs.forEach((config) => {
          expect(() => validateConfig(config)).not.toThrow();
        });
      });
    });

    describe("toolsMode validation", () => {
      it("should accept valid toolsMode values", () => {
        const validModes = ["all", "dynamic", "explicit"] as const;

        validModes.forEach((mode) => {
          const config = {
            ...minimalValidConfig,
            toolsMode: mode,
          };

          expect(() => validateConfig(config)).not.toThrow();
        });
      });

      it("should reject invalid toolsMode values", () => {
        const config = {
          ...minimalValidConfig,
          toolsMode: "invalid" as any,
        };

        expect(() => validateConfig(config)).toThrow(
          "toolsMode must be one of: all, dynamic, explicit",
        );
      });

      it("should allow undefined toolsMode", () => {
        const config = {
          ...minimalValidConfig,
          toolsMode: undefined,
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("transportType validation", () => {
      it("should accept valid transportType values", () => {
        const validTypes = ["stdio", "http"] as const;

        validTypes.forEach((type) => {
          const config = {
            ...minimalValidConfig,
            transportType: type,
          };

          expect(() => validateConfig(config)).not.toThrow();
        });
      });

      it("should reject invalid transportType values", () => {
        const config = {
          ...minimalValidConfig,
          transportType: "websocket" as any,
        };

        expect(() => validateConfig(config)).toThrow(
          "transportType must be one of: stdio, http",
        );
      });

      it("should allow undefined transportType", () => {
        const config = {
          ...minimalValidConfig,
          transportType: undefined,
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("authentication conflict validation", () => {
      it("should warn when both authProvider and headers are provided", () => {
        const mockAuthProvider = createMockAuthProvider();
        const config = {
          ...minimalValidConfig,
          authProvider: mockAuthProvider,
          headers: { "X-API-Key": "test-key" },
        };

        validateConfig(config);

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "Both authProvider and headers provided. authProvider takes precedence.",
        );
      });

      it("should not warn when only authProvider is provided", () => {
        const mockAuthProvider = createMockAuthProvider();
        const config = {
          ...minimalValidConfig,
          authProvider: mockAuthProvider,
        };

        validateConfig(config);

        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });

      it("should not warn when only headers are provided", () => {
        const config = {
          ...minimalValidConfig,
          headers: { "X-API-Key": "test-key" },
        };

        validateConfig(config);

        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe("default value merging", () => {
      it("should merge with default configuration", () => {
        const result = validateConfig(minimalValidConfig);

        expect(result).toEqual({
          ...DEFAULT_CONFIG,
          ...minimalValidConfig,
        });
      });

      it("should preserve provided values over defaults", () => {
        const customConfig = {
          ...minimalValidConfig,
          name: "custom-server",
          version: "2.0.0",
          transportType: "http" as const,
          httpPort: 8080,
          toolsMode: "dynamic" as const,
          debug: true,
        };

        const result = validateConfig(customConfig);

        expect(result.name).toBe("custom-server");
        expect(result.version).toBe("2.0.0");
        expect(result.transportType).toBe("http");
        expect(result.httpPort).toBe(8080);
        expect(result.toolsMode).toBe("dynamic");
        expect(result.debug).toBe(true);
      });

      it("should apply defaults for undefined values", () => {
        const result = validateConfig(minimalValidConfig);

        expect(result.name).toBe(DEFAULT_CONFIG.name);
        expect(result.version).toBe(DEFAULT_CONFIG.version);
        expect(result.transportType).toBe(DEFAULT_CONFIG.transportType);
        expect(result.httpPort).toBe(DEFAULT_CONFIG.httpPort);
        expect(result.httpHost).toBe(DEFAULT_CONFIG.httpHost);
        expect(result.endpointPath).toBe(DEFAULT_CONFIG.endpointPath);
        expect(result.toolsMode).toBe(DEFAULT_CONFIG.toolsMode);
        expect(result.specInputMethod).toBe(DEFAULT_CONFIG.specInputMethod);
        expect(result.disableAbbreviation).toBe(
          DEFAULT_CONFIG.disableAbbreviation,
        );
        expect(result.debug).toBe(DEFAULT_CONFIG.debug);
      });
    });

    describe("comprehensive validation scenarios", () => {
      it("should validate complete HTTP server configuration", () => {
        const fullHttpConfig: IOpenAPIServerConfig = {
          name: "api-gateway",
          version: "3.1.0",
          apiBaseUrl: "https://api.example.com",
          openApiSpec: "./specs/api.yaml",
          specInputMethod: "file",
          headers: {
            Authorization: "Bearer token",
            "X-API-Key": "key123",
          },
          transportType: "http",
          httpPort: 9000,
          httpHost: "0.0.0.0",
          endpointPath: "/api/mcp",
          toolsMode: "explicit",
          includeTags: ["users", "posts"],
          includeOperations: ["GET", "POST"],
          disableAbbreviation: true,
          debug: true,
        };

        const result = validateConfig(fullHttpConfig);

        // Should merge with defaults, but provided values should override
        expect(result).toEqual({
          ...DEFAULT_CONFIG,
          ...fullHttpConfig,
        });
        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });

      it("should validate complete stdio configuration with dynamic auth", () => {
        const mockAuthProvider = createMockAuthProvider();

        const fullStdioConfig: IOpenAPIServerConfig = {
          name: "claude-integration",
          version: "1.2.0",
          apiBaseUrl: "https://internal-api.company.com",
          openApiSpec: "https://internal-api.company.com/spec.json",
          specInputMethod: "url",
          authProvider: mockAuthProvider,
          transportType: "stdio",
          toolsMode: "dynamic",
          includeResources: ["users", "projects"],
          disableAbbreviation: false,
          debug: false,
        };

        const result = validateConfig(fullStdioConfig);

        // Should merge with defaults
        expect(result).toEqual({
          ...DEFAULT_CONFIG,
          ...fullStdioConfig,
        });
        expect(mockedLogger.warn).not.toHaveBeenCalled();
      });

      it("should handle edge case with stdin input method", () => {
        const stdinConfig: IOpenAPIServerConfig = {
          apiBaseUrl: "https://api.stdin-example.com",
          specInputMethod: "stdin",
          toolsMode: "all",
        };

        const result = validateConfig(stdinConfig);

        expect(result.specInputMethod).toBe("stdin");
        expect(result.toolsMode).toBe("all");
        expect(result.transportType).toBe(DEFAULT_CONFIG.transportType);
      });

      it("should handle edge case with inline spec", () => {
        const inlineConfig: IOpenAPIServerConfig = {
          apiBaseUrl: "https://api.inline-example.com",
          specInputMethod: "inline",
          openApiSpec: JSON.stringify({
            openapi: "3.0.0",
            info: { title: "Test" },
          }),
        };

        const result = validateConfig(inlineConfig);

        expect(result.specInputMethod).toBe("inline");
        expect(result.openApiSpec).toBe(inlineConfig.openApiSpec);
      });
    });

    describe("error handling edge cases", () => {
      it("should handle null apiBaseUrl", () => {
        const config = {
          apiBaseUrl: null,
          openApiSpec: "test.json",
        } as any;

        expect(() => validateConfig(config)).toThrow("apiBaseUrl is required");
      });

      it("should handle undefined config properties gracefully", () => {
        const config = {
          apiBaseUrl: "https://api.example.com",
          openApiSpec: "test.json",
          transportType: undefined,
          toolsMode: undefined,
          headers: undefined,
          authProvider: undefined,
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should validate with boolean false values", () => {
        const config = {
          apiBaseUrl: "https://api.example.com",
          openApiSpec: "test.json",
          debug: false,
          disableAbbreviation: false,
        };

        const result = validateConfig(config);

        expect(result.debug).toBe(false);
        expect(result.disableAbbreviation).toBe(false);
      });
    });
  });
});
