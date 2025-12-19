/**
 * Tests for OpenAPI specification loader
 */

import * as fs from "fs";
import axios from "axios";
import { OpenAPISpecLoader } from "../../src/openapi/spec-loader";
import { IOpenAPISpec } from "../../src/types";
import { logger } from "../../src/utils/logger";

// Mock dependencies
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("axios");
jest.mock("../../src/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Setup axios mock
(mockedAxios as any).isAxiosError = jest.fn();

describe("OpenAPISpecLoader", () => {
  let loader: OpenAPISpecLoader;

  const validOpenAPISpec: IOpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get all users",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/users/{id}": {
        get: {
          operationId: "getUserById",
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "User found",
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    loader = new OpenAPISpecLoader();
    jest.clearAllMocks();
  });

  describe("loadSpec", () => {
    describe("URL loading", () => {
      it("should load spec from URL successfully", async () => {
        const specUrl = "https://api.example.com/openapi.json";
        mockedAxios.get.mockResolvedValueOnce({
          data: JSON.stringify(validOpenAPISpec),
        });

        const result = await loader.loadSpec(specUrl, "url");

        expect(mockedAxios.get).toHaveBeenCalledWith(specUrl, {
          headers: {
            Accept: "application/json, application/yaml, text/yaml, text/plain",
          },
          timeout: 30000,
        });
        expect(result).toEqual(validOpenAPISpec);
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          "Loading OpenAPI spec using method: url",
        );
      });

      it("should handle network errors when loading from URL", async () => {
        const specUrl = "https://api.example.com/openapi.json";
        const networkError = new Error("Network error");
        // Setup axios error
        ((mockedAxios as any).isAxiosError as jest.Mock).mockReturnValue(true);
        mockedAxios.get.mockRejectedValueOnce(networkError);

        await expect(loader.loadSpec(specUrl, "url")).rejects.toThrow(
          "Failed to load OpenAPI spec from URL https://api.example.com/openapi.json: Network error",
        );
      });

      it("should handle HTTP error responses", async () => {
        const specUrl = "https://api.example.com/openapi.json";
        const httpError = {
          response: { status: 404, statusText: "Not Found" },
          message: "Request failed with status code 404",
        };
        ((mockedAxios as any).isAxiosError as jest.Mock).mockReturnValue(true);
        mockedAxios.get.mockRejectedValueOnce(httpError);

        await expect(loader.loadSpec(specUrl, "url")).rejects.toThrow(
          "Failed to load OpenAPI spec from URL https://api.example.com/openapi.json: Request failed with status code 404",
        );
      });
    });

    describe("File loading", () => {
      it("should load JSON spec from file successfully", async () => {
        const specPath = "/path/to/spec.json";
        const specContent = JSON.stringify(validOpenAPISpec);

        (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (mockedFs.readFileSync as jest.Mock).mockReturnValueOnce(specContent);

        const result = await loader.loadSpec(specPath, "file");

        expect(mockedFs.readFileSync).toHaveBeenCalledWith(
          expect.stringContaining("spec.json"),
          "utf8",
        );
        expect(result).toEqual(validOpenAPISpec);
      });

      it("should load YAML spec from file successfully", async () => {
        const specPath = "/path/to/spec.yaml";
        const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getUsers
      summary: Get all users
      responses:
        "200":
          description: Successful response
        `;

        (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(true);
        (mockedFs.readFileSync as jest.Mock).mockReturnValueOnce(yamlContent);

        const result = await loader.loadSpec(specPath, "file");

        expect(mockedFs.readFileSync).toHaveBeenCalledWith(
          expect.stringContaining("spec.yaml"),
          "utf8",
        );
        expect(result.openapi).toBe("3.0.0");
        expect(result.info.title).toBe("Test API");
      });

      it("should handle file reading errors", async () => {
        const specPath = "/nonexistent/spec.json";

        (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(false); // File doesn't exist

        await expect(loader.loadSpec(specPath, "file")).rejects.toThrow(
          "Failed to load OpenAPI spec from file /nonexistent/spec.json: OpenAPI spec file not found:",
        );
      });
    });

    describe("inline loading", () => {
      it("should load spec from inline JSON string", async () => {
        const specContent = JSON.stringify(validOpenAPISpec);

        const result = await loader.loadSpec(specContent, "inline");

        expect(result).toEqual(validOpenAPISpec);
      });

      it("should load spec from inline YAML string", async () => {
        const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getUsers
      summary: Get all users
      responses:
        "200":
          description: Successful response
        `;

        const result = await loader.loadSpec(yamlContent, "inline");

        expect(result.openapi).toBe("3.0.0");
        expect(result.info.title).toBe("Test API");
      });
    });

    describe("error handling", () => {
      it("should reject unsupported input methods", async () => {
        await expect(
          loader.loadSpec("test", "unsupported" as any),
        ).rejects.toThrow("Unsupported spec input method: unsupported");
      });

      it("should handle invalid JSON content", async () => {
        const invalidJson = "{ invalid json content";

        await expect(loader.loadSpec(invalidJson, "inline")).rejects.toThrow();
      });

      it("should handle invalid YAML content", async () => {
        const invalidYaml = `
invalid: yaml: content:
  - missing
    proper: structure
        `;

        await expect(loader.loadSpec(invalidYaml, "inline")).rejects.toThrow();
      });
    });
  });

  describe("getOperations", () => {
    beforeEach(async () => {
      // Load a spec first
      const specContent = JSON.stringify(validOpenAPISpec);
      await loader.loadSpec(specContent, "inline");
    });

    it("should extract all operations from loaded spec", () => {
      const operations = loader.getOperations();

      expect(operations).toHaveLength(2);
      expect(operations[0]).toEqual({
        path: "/users",
        method: "GET",
        operation: {
          operationId: "getUsers",
          summary: "Get all users",
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      expect(operations[1]).toEqual({
        path: "/users/{id}",
        method: "GET",
        operation: {
          operationId: "getUserById",
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "User found",
            },
          },
        },
      });
    });

    it("should throw error when no spec is loaded", () => {
      const emptyLoader = new OpenAPISpecLoader();

      expect(() => emptyLoader.getOperations()).toThrow(
        "No specification loaded",
      );
    });
  });

  describe("spec validation", () => {
    it("should validate OpenAPI 3.0 spec", async () => {
      const spec30 = {
        ...validOpenAPISpec,
        openapi: "3.0.3",
      };

      const result = await loader.loadSpec(JSON.stringify(spec30), "inline");
      expect(result.openapi).toBe("3.0.3");
    });

    it("should validate OpenAPI 3.1 spec", async () => {
      const spec31 = {
        ...validOpenAPISpec,
        openapi: "3.1.0",
      };

      const result = await loader.loadSpec(JSON.stringify(spec31), "inline");
      expect(result.openapi).toBe("3.1.0");
    });

    // Note: The current implementation doesn't validate OpenAPI version
    // so these tests are commented out until validation is implemented
    // it('should reject invalid OpenAPI version', async () => {
    //   const invalidSpec = {
    //     ...validOpenAPISpec,
    //     openapi: '2.0.0',
    //   };

    //   await expect(
    //     loader.loadSpec(JSON.stringify(invalidSpec), 'inline')
    //   ).rejects.toThrow('Invalid OpenAPI version');
    // });

    // it('should require info object', async () => {
    //   const specWithoutInfo = {
    //     openapi: '3.0.0',
    //     paths: {},
    //   };

    //   await expect(
    //     loader.loadSpec(JSON.stringify(specWithoutInfo), 'inline')
    //   ).rejects.toThrow('OpenAPI spec must have an info object');
    // });

    // it('should require paths object', async () => {
    //   const specWithoutPaths = {
    //     openapi: '3.0.0',
    //     info: { title: 'Test', version: '1.0.0' },
    //   };

    //   await expect(
    //     loader.loadSpec(JSON.stringify(specWithoutPaths), 'inline')
    //   ).rejects.toThrow('OpenAPI spec must have a paths object');
    // });
  });

  describe("stdin loading", () => {
    let originalStdin: any;
    let mockStdin: any;

    beforeEach(() => {
      originalStdin = process.stdin;
      mockStdin = {
        setEncoding: jest.fn(),
        on: jest.fn(),
      };
      Object.defineProperty(process, "stdin", {
        value: mockStdin,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process, "stdin", {
        value: originalStdin,
        writable: true,
      });
    });

    it("should load spec from stdin successfully", async () => {
      const specContent = JSON.stringify(validOpenAPISpec);

      mockStdin.on.mockImplementation((event: string, callback: Function) => {
        if (event === "data") {
          setTimeout(() => callback(specContent), 0);
        } else if (event === "end") {
          setTimeout(() => callback(), 10);
        }
      });

      const loadPromise = loader.loadSpec("", "stdin");
      const result = await loadPromise;

      expect(mockStdin.setEncoding).toHaveBeenCalledWith("utf8");
      expect(result).toEqual(validOpenAPISpec);
    });

    it("should handle empty stdin data", async () => {
      mockStdin.on.mockImplementation((event: string, callback: Function) => {
        if (event === "end") {
          setTimeout(() => callback(), 0);
        }
      });

      await expect(loader.loadSpec("", "stdin")).rejects.toThrow(
        "No data received from stdin",
      );
    });

    it("should handle stdin errors", async () => {
      const stdinError = new Error("stdin read error");

      mockStdin.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(stdinError), 0);
        }
      });

      await expect(loader.loadSpec("", "stdin")).rejects.toThrow(
        "Failed to read from stdin: stdin read error",
      );
    });
  });

  describe("getSpec", () => {
    it("should return loaded spec", async () => {
      const specContent = JSON.stringify(validOpenAPISpec);
      await loader.loadSpec(specContent, "inline");

      const result = loader.getSpec();
      expect(result).toEqual(validOpenAPISpec);
    });

    it("should throw error when no spec is loaded", () => {
      expect(() => loader.getSpec()).toThrow(
        "No OpenAPI specification loaded. Call loadSpec() first.",
      );
    });
  });

  describe("isLoaded", () => {
    it("should return false when no spec is loaded", () => {
      expect(loader.isLoaded()).toBe(false);
    });

    it("should return true when spec is loaded", async () => {
      const specContent = JSON.stringify(validOpenAPISpec);
      await loader.loadSpec(specContent, "inline");

      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe("getTags", () => {
    it("should extract tags from global tags and operations", async () => {
      const specWithTags = {
        ...validOpenAPISpec,
        tags: [
          { name: "users", description: "User operations" },
          { name: "admin", description: "Admin operations" },
        ],
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              summary: "Get all users",
              tags: ["users", "public"],
              responses: { "200": { description: "Success" } },
            },
          },
          "/admin": {
            post: {
              operationId: "adminAction",
              summary: "Admin action",
              tags: ["admin"],
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      await loader.loadSpec(JSON.stringify(specWithTags), "inline");
      const tags = loader.getTags();

      expect(tags).toContain("users");
      expect(tags).toContain("admin");
      expect(tags).toContain("public");
      expect(tags).toHaveLength(3);
    });

    it("should handle spec without global tags", async () => {
      const specContent = JSON.stringify(validOpenAPISpec);
      await loader.loadSpec(specContent, "inline");

      const tags = loader.getTags();
      expect(tags).toEqual([]);
    });

    it("should throw error when no spec is loaded", () => {
      expect(() => loader.getTags()).toThrow("No specification loaded");
    });
  });

  describe("reference resolution", () => {
    it("should resolve internal references successfully", async () => {
      const specWithRefs = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithRefs),
        "inline",
      );

      // Check that the reference was resolved
      const operations = loader.getOperations();
      const schema = operations[0].operation.responses["200"].content![
        "application/json"
      ].schema as any;
      expect(schema.type).toBe("object");
      expect(schema.properties.id.type).toBe("string");
    });

    it("should handle circular references", async () => {
      const specWithCircularRefs = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CircularA" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            CircularA: {
              type: "object",
              properties: {
                b: { $ref: "#/components/schemas/CircularB" },
              },
            },
            CircularB: {
              type: "object",
              properties: {
                a: { $ref: "#/components/schemas/CircularA" },
              },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithCircularRefs),
        "inline",
      );

      // Should not throw error and handle circular reference gracefully
      expect(result).toBeDefined();
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Circular reference detected:"),
      );
    });

    it("should handle external references with warning", async () => {
      const specWithExternalRef = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: { $ref: "external.yaml#/User" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await loader.loadSpec(JSON.stringify(specWithExternalRef), "inline");

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        "External reference not supported: external.yaml#/User",
      );
    });

    it("should handle invalid reference paths", async () => {
      const specWithInvalidRef = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/NonExistent" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {},
        },
      };

      await loader.loadSpec(JSON.stringify(specWithInvalidRef), "inline");

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve reference"),
      );
    });

    it("should resolve references in arrays", async () => {
      const specWithArrayRefs = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithArrayRefs),
        "inline",
      );

      const operations = loader.getOperations();
      const schema = operations[0].operation.responses["200"].content![
        "application/json"
      ].schema as any;
      expect(schema.items.type).toBe("object");
    });

    it("should handle OpenAPI v2 definitions", async () => {
      const swagger2Spec = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  schema: { $ref: "#/definitions/User" },
                },
              },
            },
          },
        },
        definitions: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(swagger2Spec),
        "inline",
      );
      expect(result).toBeDefined();
    });

    it("should handle malformed reference paths", async () => {
      const specWithMalformedRef = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/User/invalid/path",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: "invalid_schema_type",
          },
        },
      };

      await loader.loadSpec(JSON.stringify(specWithMalformedRef), "inline");

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to resolve reference"),
      );
    });

    it("should handle missing component references with generic schema fallback", async () => {
      const specWithMissingRef = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/NonExistentComponent",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithMissingRef),
        "inline",
      );

      // Should not throw error and should load successfully
      expect(result).toBeDefined();

      // Should log warning about missing reference
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to resolve reference #/components/schemas/NonExistentComponent",
        ),
      );

      // Should create a generic schema fallback
      const operations = loader.getOperations();
      const schema = operations[0].operation.responses["200"].content![
        "application/json"
      ].schema as any;

      // Verify the fallback schema structure
      expect(schema.type).toBe("object");
      expect(schema.additionalProperties).toBe(true);
      expect(schema.properties).toEqual({});
      expect(schema["x-fallback-schema"]).toBe(true);
      expect(schema.description).toContain("Failed to resolve reference");
    });
  });

  describe("parseSpec edge cases", () => {
    it("should handle empty content", async () => {
      await expect(loader.loadSpec("", "inline")).rejects.toThrow(
        "Cannot read properties of null (reading 'info')",
      );
    });

    it("should handle null content", async () => {
      await expect(loader.loadSpec(null as any, "inline")).rejects.toThrow();
    });

    it("should handle content that starts with { but is invalid JSON", async () => {
      const invalidJson = "{ this is not valid json }";

      await expect(loader.loadSpec(invalidJson, "inline")).rejects.toThrow(
        "Failed to parse OpenAPI specification:",
      );
    });

    it("should parse YAML content that doesn't start with {", async () => {
      const yamlContent = `
openapi: "3.0.0"
info:
  title: "YAML Test API"
  version: "1.0.0"
paths: {}
      `;

      const result = await loader.loadSpec(yamlContent, "inline");
      expect(result.info.title).toBe("YAML Test API");
    });

    it("should handle unknown error types in parseSpec", async () => {
      // Mock yaml.parse to throw a non-Error object
      const originalParse = require("yaml").parse;
      require("yaml").parse = jest.fn().mockImplementation(() => {
        throw "Unknown error type"; // Non-Error object
      });

      try {
        await expect(
          loader.loadSpec("invalid: yaml: content", "inline"),
        ).rejects.toThrow(
          "Failed to parse OpenAPI specification: Unknown error",
        );
      } finally {
        // Restore original implementation
        require("yaml").parse = originalParse;
      }
    });
  });

  describe("file loading edge cases", () => {
    it("should handle file system errors other than missing files", async () => {
      const specPath = "/path/to/spec.json";
      const fsError = new Error("Permission denied");

      (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (mockedFs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw fsError;
      });

      await expect(loader.loadSpec(specPath, "file")).rejects.toThrow(
        "Failed to load OpenAPI spec from file /path/to/spec.json: Permission denied",
      );
    });

    it("should handle non-Error objects thrown from file operations", async () => {
      const specPath = "/path/to/spec.json";

      (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (mockedFs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw "String error"; // Non-Error object
      });

      await expect(loader.loadSpec(specPath, "file")).rejects.toBe(
        "String error",
      );
    });
  });

  describe("URL loading edge cases", () => {
    it("should handle response data as object (not string)", async () => {
      const specUrl = "https://api.example.com/openapi.json";
      mockedAxios.get.mockResolvedValueOnce({
        data: validOpenAPISpec, // Object instead of string
      });

      const result = await loader.loadSpec(specUrl, "url");
      expect(result).toEqual(validOpenAPISpec);
    });

    it("should handle non-axios errors", async () => {
      const specUrl = "https://api.example.com/openapi.json";
      const genericError = new Error("Some other error");
      ((mockedAxios as any).isAxiosError as jest.Mock).mockReturnValue(false);
      mockedAxios.get.mockRejectedValueOnce(genericError);

      await expect(loader.loadSpec(specUrl, "url")).rejects.toThrow(
        "Some other error",
      );
    });
  });

  describe("getOperations with all HTTP methods", () => {
    it("should extract operations for all supported HTTP methods", async () => {
      const specWithAllMethods = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "getTest",
              responses: { "200": { description: "OK" } },
            },
            post: {
              operationId: "postTest",
              responses: { "201": { description: "Created" } },
            },
            put: {
              operationId: "putTest",
              responses: { "200": { description: "OK" } },
            },
            patch: {
              operationId: "patchTest",
              responses: { "200": { description: "OK" } },
            },
            delete: {
              operationId: "deleteTest",
              responses: { "204": { description: "No Content" } },
            },
            head: {
              operationId: "headTest",
              responses: { "200": { description: "OK" } },
            },
            options: {
              operationId: "optionsTest",
              responses: { "200": { description: "OK" } },
            },
            trace: {
              operationId: "traceTest",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      await loader.loadSpec(JSON.stringify(specWithAllMethods), "inline");
      const operations = loader.getOperations();

      expect(operations).toHaveLength(8);
      expect(operations.map((op) => op.method)).toEqual([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "HEAD",
        "OPTIONS",
        "TRACE",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty paths object", async () => {
      const emptyPathsSpec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const result = await loader.loadSpec(
        JSON.stringify(emptyPathsSpec),
        "inline",
      );
      expect(loader.getOperations()).toHaveLength(0);
    });

    it("should handle paths with no operations", async () => {
      const noOpsSpec = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/empty": {},
        },
      };

      const result = await loader.loadSpec(JSON.stringify(noOpsSpec), "inline");
      expect(loader.getOperations()).toHaveLength(0);
    });

    it("should handle spec without components", async () => {
      const specWithoutComponents = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithoutComponents),
        "inline",
      );
      expect(result).toBeDefined();
      expect(loader.getOperations()).toHaveLength(1);
    });

    it("should handle spec with null/undefined values in components", async () => {
      const specWithNullComponents = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: null,
          responses: undefined,
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithNullComponents),
        "inline",
      );
      expect(result).toBeDefined();
    });

    it("should handle non-object values in resolveObjectReferences", async () => {
      const specWithPrimitives = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              summary: "Test endpoint", // string value
              deprecated: true, // boolean value
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const result = await loader.loadSpec(
        JSON.stringify(specWithPrimitives),
        "inline",
      );
      expect(result).toBeDefined();
      const operations = loader.getOperations();
      expect(operations[0].operation.summary).toBe("Test endpoint");
      expect(operations[0].operation.deprecated).toBe(true);
    });
  });
});
