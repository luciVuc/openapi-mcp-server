import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  createToolFromOperation,
  createMetaTools,
} from "../../src/tools/creation";
import { IOperation } from "../../src/types";
import {
  generateToolId,
  extractResourceName,
} from "../../src/tools/utils/id-generator";
import { generateToolName } from "../../src/tools/utils/name-generator";
import { logger } from "../../src/utils/logger";

// Mock dependencies
jest.mock("../../src/tools/utils/id-generator");
jest.mock("../../src/tools/utils/name-generator");
jest.mock("../../src/utils/logger");

const mockedGenerateToolId = generateToolId as jest.MockedFunction<
  typeof generateToolId
>;
const mockedExtractResourceName = extractResourceName as jest.MockedFunction<
  typeof extractResourceName
>;
const mockedGenerateToolName = generateToolName as jest.MockedFunction<
  typeof generateToolName
>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("Tools Creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockedGenerateToolId.mockImplementation(
      (method, path) => `${method}::${path.replace(/\//g, "__")}`,
    );
    mockedExtractResourceName.mockImplementation(
      (path) => path.split("/").pop() || "unknown",
    );
    mockedGenerateToolName.mockImplementation((name) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    );
  });

  describe("createToolFromOperation", () => {
    const basePath = "/api/v1/users";
    const method = "GET";

    it("should create basic tool with minimal operation", () => {
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolId.mockReturnValue("GET::api__v1__users");
      mockedExtractResourceName.mockReturnValue("users");
      mockedGenerateToolName.mockReturnValue("get-users");

      const result = createToolFromOperation(basePath, method, operation);

      expect(result).toEqual({
        name: "get-users",
        description: "GET /api/v1/users",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
        tags: [],
        method: "GET",
        resourceName: "users",
        originalPath: basePath,
        toolId: "GET::api__v1__users",
      });

      expect(mockedGenerateToolId).toHaveBeenCalledWith("GET", basePath);
      expect(mockedExtractResourceName).toHaveBeenCalledWith(basePath);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        "Created tool: get-users (GET::api__v1__users)",
      );
    });

    it("should use operationId for tool name when available", () => {
      const operation: IOperation = {
        operationId: "getUserList",
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolName.mockReturnValue("get-user-list");

      const result = createToolFromOperation(
        basePath,
        method,
        operation,
        false,
      ) as Tool;

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "getUserList",
        false,
        undefined,
      );
      expect(result.name).toBe("get-user-list");
    });

    it("should use summary for tool name when operationId is missing", () => {
      const operation: IOperation = {
        summary: "Get all users",
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolName.mockReturnValue("get-all-users");

      const result = createToolFromOperation(
        basePath,
        method,
        operation,
        false,
      ) as Tool;

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "Get all users",
        false,
        undefined,
      );
      expect(result.name).toBe("get-all-users");
    });

    it("should fallback to method-path combination when no operationId or summary", () => {
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolName.mockReturnValue("get-users");

      const result = createToolFromOperation(
        basePath,
        method,
        operation,
        false,
      ) as Tool;

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "get-users",
        false,
        undefined,
      );
      expect(result.name).toBe("get-users");
    });

    it("should handle complex path for fallback name generation", () => {
      const complexPath =
        "/api/v1/organizations/{org}/projects/{project}/users";
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolName.mockReturnValue("get-users");

      createToolFromOperation(complexPath, method, operation);

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "get-users",
        false,
        undefined,
      );
    });

    it("should handle path with only parameters for fallback", () => {
      const paramOnlyPath = "/{id}";
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      mockedGenerateToolName.mockReturnValue("get-endpoint");

      createToolFromOperation(paramOnlyPath, method, operation);

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "get-endpoint",
        false,
        undefined,
      );
    });

    it("should create comprehensive description with all metadata", () => {
      const operation: IOperation = {
        summary: "Get user details",
        description: "Retrieves detailed information about a specific user",
        deprecated: true,
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        basePath,
        method,
        operation,
      ) as Tool;

      expect(result.description).toBe(
        "GET /api/v1/users\n\nGet user details\n\nRetrieves detailed information about a specific user\n\n⚠️ This operation is deprecated.",
      );
    });

    it("should handle operation with tags", () => {
      const operation: IOperation = {
        tags: ["users", "management"],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(basePath, method, operation);

      expect(result.tags).toEqual(["users", "management"]);
    });

    it("should pass abbreviation setting to name generator", () => {
      const operation: IOperation = {
        operationId: "getUserDetails",
        responses: { "200": { description: "Success" } },
      };

      createToolFromOperation(basePath, method, operation, true);

      expect(mockedGenerateToolName).toHaveBeenCalledWith(
        "getUserDetails",
        true,
        undefined,
      );
    });
  });

  describe("createInputSchema - parameter handling", () => {
    it("should handle path parameters", () => {
      const path = "/api/users/{id}";
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(path, "GET", operation) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          id: {
            type: "string",
            "x-parameter-location": "path",
          },
        },
        required: ["id"],
        additionalProperties: false,
      });
    });

    it("should handle multiple path parameters", () => {
      const path = "/api/organizations/{orgId}/projects/{projectId}";
      const operation: IOperation = {
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(path, "GET", operation) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          orgId: {
            type: "string",
            "x-parameter-location": "path",
          },
          projectId: {
            type: "string",
            "x-parameter-location": "path",
          },
        },
        required: ["orgId", "projectId"],
        additionalProperties: false,
      });
    });

    it("should handle query parameters", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100 },
            description: "Maximum number of items to return",
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
          },
        ],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            description: "Maximum number of items to return",
            "x-parameter-location": "query",
          },
          offset: {
            type: "integer",
            minimum: 0,
            "x-parameter-location": "query",
          },
        },
        required: [],
        additionalProperties: false,
      });
    });

    it("should handle required query parameters", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "apiKey",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "API key for authentication",
          },
        ],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema.required).toContain("apiKey");
      expect(result.inputSchema.properties!.apiKey).toEqual({
        type: "string",
        description: "API key for authentication",
        "x-parameter-location": "query",
      });
    });

    it("should handle header parameters", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "X-Custom-Header",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Custom header value",
          },
        ],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!["X-Custom-Header"]).toEqual({
        type: "string",
        description: "Custom header value",
        "x-parameter-location": "header",
      });
      expect(result.inputSchema.required).toContain("X-Custom-Header");
    });

    it("should handle cookie parameters", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "sessionId",
            in: "cookie",
            required: false,
            schema: { type: "string" },
            description: "Session identifier",
          },
        ],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!.sessionId).toEqual({
        type: "string",
        description: "Session identifier",
        "x-parameter-location": "cookie",
      });
      expect(result.inputSchema.required).not.toContain("sessionId");
    });

    it("should handle parameters without schema", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "simpleParam",
            in: "query",
            required: false,
          },
        ],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!.simpleParam).toEqual({
        type: "string",
        "x-parameter-location": "query",
      });
    });
  });

  describe("createInputSchema - request body handling", () => {
    it("should handle simple JSON request body", () => {
      const operation: IOperation = {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
        required: ["name"],
        additionalProperties: false,
      });
    });

    it("should wrap non-object request body in body property", () => {
      const operation: IOperation = {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          body: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["body"],
        additionalProperties: false,
      });
    });

    it("should handle optional request body", () => {
      const operation: IOperation = {
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "string",
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema.required).not.toContain("body");
    });

    it("should handle application/vnd.api+json content type", () => {
      const operation: IOperation = {
        requestBody: {
          required: true,
          content: {
            "application/vnd.api+json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!.data).toEqual({ type: "object" });
    });

    it("should prioritize application/json over other JSON content types", () => {
      const operation: IOperation = {
        requestBody: {
          content: {
            "application/vnd.api+json": {
              schema: {
                type: "object",
                properties: { wrong: { type: "string" } },
              },
            },
            "application/json": {
              schema: {
                type: "object",
                properties: { correct: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!.correct).toBeDefined();
      expect(result.inputSchema.properties!.wrong).toBeUndefined();
    });

    it("should ignore non-JSON content types", () => {
      const operation: IOperation = {
        requestBody: {
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
            "application/xml": {
              schema: { type: "string" },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      });
    });
  });

  describe("createInputSchema - combined parameters and body", () => {
    it("should combine path parameters, query parameters, and request body", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users/{id}",
        "PUT",
        operation,
      ) as Tool;

      expect(result.inputSchema).toEqual({
        type: "object",
        properties: {
          id: {
            type: "string",
            "x-parameter-location": "path",
          },
          limit: {
            type: "integer",
            "x-parameter-location": "query",
          },
          Authorization: {
            type: "string",
            "x-parameter-location": "header",
          },
          name: { type: "string" },
          status: { type: "string" },
        },
        required: ["id", "Authorization", "name"],
        additionalProperties: false,
      });
    });

    it("should handle name conflicts between parameters and body properties", () => {
      const operation: IOperation = {
        parameters: [
          {
            name: "name",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      // The body property should overwrite the parameter property
      expect(result.inputSchema.properties!.name).toEqual({ type: "string" });
      expect(result.inputSchema.required).toContain("name");
    });
  });

  describe("createMetaTools", () => {
    it("should create all meta-tools with correct structure", () => {
      const metaTools = createMetaTools();

      expect(metaTools).toHaveLength(3);

      expect(metaTools[0]).toEqual({
        name: "list-api-endpoints",
        description:
          "List all available API endpoints from the OpenAPI specification",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description: "Filter endpoints by OpenAPI tag",
            },
            method: {
              type: "string",
              description: "Filter endpoints by HTTP method",
              enum: [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "HEAD",
                "OPTIONS",
              ],
            },
          },
          additionalProperties: false,
        },
        toolId: "meta::list-endpoints",
      });

      expect(metaTools[1]).toEqual({
        name: "get-api-endpoint-schema",
        description:
          "Get detailed schema information for a specific API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            toolId: {
              type: "string",
              description: "The tool ID of the endpoint to get schema for",
            },
          },
          required: ["toolId"],
          additionalProperties: false,
        },
        toolId: "meta::get-endpoint-schema",
      });

      expect(metaTools[2]).toEqual({
        name: "invoke-api-endpoint",
        description:
          "Invoke any API endpoint directly by tool ID with parameters",
        inputSchema: {
          type: "object",
          properties: {
            toolId: {
              type: "string",
              description: "The tool ID of the endpoint to invoke",
            },
            parameters: {
              type: "object",
              description: "Parameters to pass to the endpoint",
              additionalProperties: true,
            },
          },
          required: ["toolId"],
          additionalProperties: false,
        },
        toolId: "meta::invoke-endpoint",
      });
    });

    it("should return the same meta-tools on multiple calls", () => {
      const metaTools1 = createMetaTools();
      const metaTools2 = createMetaTools();

      expect(metaTools1).toEqual(metaTools2);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty operation", () => {
      const operation: IOperation = {
        responses: {},
      };

      expect(() =>
        createToolFromOperation("/api/test", "GET", operation),
      ).not.toThrow();
    });

    it("should handle operation with empty parameters array", () => {
      const operation: IOperation = {
        parameters: [],
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/test",
        "GET",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties).toEqual({});
      expect(result.inputSchema.required).toEqual([]);
    });

    it("should handle operation with null/undefined properties", () => {
      const operation: IOperation = {
        operationId: undefined,
        summary: null as any,
        description: undefined,
        tags: undefined,
        parameters: undefined,
        requestBody: undefined,
        responses: { "200": { description: "Success" } },
      };

      expect(() =>
        createToolFromOperation("/api/test", "GET", operation),
      ).not.toThrow();
    });

    it("should handle complex schema references", () => {
      const operation: IOperation = {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties!.body).toEqual({
        $ref: "#/components/schemas/User",
      });
    });

    it("should handle request body with no content", () => {
      const operation: IOperation = {
        requestBody: {
          description: "Empty body",
        } as any,
        responses: { "200": { description: "Success" } },
      };

      const result = createToolFromOperation(
        "/api/users",
        "POST",
        operation,
      ) as Tool;

      expect(result.inputSchema.properties).toEqual({});
    });
  });
});

describe("createInputSchema - parameter handling", () => {
  it("should handle path parameters", () => {
    const path = "/api/users/{id}";
    const operation: IOperation = {
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(path, "GET", operation) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-parameter-location": "path",
        },
      },
      required: ["id"],
      additionalProperties: false,
    });
  });

  it("should handle multiple path parameters", () => {
    const path = "/api/organizations/{orgId}/projects/{projectId}";
    const operation: IOperation = {
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(path, "GET", operation) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        orgId: {
          type: "string",
          "x-parameter-location": "path",
        },
        projectId: {
          type: "string",
          "x-parameter-location": "path",
        },
      },
      required: ["orgId", "projectId"],
      additionalProperties: false,
    });
  });

  it("should handle query parameters", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
          description: "Maximum number of items to return",
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 0 },
        },
      ],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum number of items to return",
          "x-parameter-location": "query",
        },
        offset: {
          type: "integer",
          minimum: 0,
          "x-parameter-location": "query",
        },
      },
      required: [],
      additionalProperties: false,
    });
  });

  it("should handle required query parameters", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "apiKey",
          in: "query",
          required: true,
          schema: { type: "string" },
          description: "API key for authentication",
        },
      ],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema.required).toContain("apiKey");
    expect(result.inputSchema.properties!.apiKey).toEqual({
      type: "string",
      description: "API key for authentication",
      "x-parameter-location": "query",
    });
  });

  it("should handle header parameters", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "X-Custom-Header",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "Custom header value",
        },
      ],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!["X-Custom-Header"]).toEqual({
      type: "string",
      description: "Custom header value",
      "x-parameter-location": "header",
    });
    expect(result.inputSchema.required).toContain("X-Custom-Header");
  });

  it("should handle cookie parameters", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "sessionId",
          in: "cookie",
          required: false,
          schema: { type: "string" },
          description: "Session identifier",
        },
      ],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!.sessionId).toEqual({
      type: "string",
      description: "Session identifier",
      "x-parameter-location": "cookie",
    });
    expect(result.inputSchema.required).not.toContain("sessionId");
  });

  it("should handle parameters without schema", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "simpleParam",
          in: "query",
          required: false,
        },
      ],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!.simpleParam).toEqual({
      type: "string",
      "x-parameter-location": "query",
    });
  });
});

describe("createInputSchema - request body handling", () => {
  it("should handle simple JSON request body", () => {
    const operation: IOperation = {
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string", format: "email" },
              },
              required: ["name"],
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
      },
      required: ["name"],
      additionalProperties: false,
    });
  });

  it("should wrap non-object request body in body property", () => {
    const operation: IOperation = {
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        body: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["body"],
      additionalProperties: false,
    });
  });

  it("should handle optional request body", () => {
    const operation: IOperation = {
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "string",
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema.required).not.toContain("body");
  });

  it("should handle application/vnd.api+json content type", () => {
    const operation: IOperation = {
      requestBody: {
        required: true,
        content: {
          "application/vnd.api+json": {
            schema: {
              type: "object",
              properties: {
                data: { type: "object" },
              },
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!.data).toEqual({ type: "object" });
  });

  it("should prioritize application/json over other JSON content types", () => {
    const operation: IOperation = {
      requestBody: {
        content: {
          "application/vnd.api+json": {
            schema: {
              type: "object",
              properties: { wrong: { type: "string" } },
            },
          },
          "application/json": {
            schema: {
              type: "object",
              properties: { correct: { type: "string" } },
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!.correct).toBeDefined();
    expect(result.inputSchema.properties!.wrong).toBeUndefined();
  });

  it("should ignore non-JSON content types", () => {
    const operation: IOperation = {
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string" },
          },
          "application/xml": {
            schema: { type: "string" },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    });
  });
});

describe("createInputSchema - combined parameters and body", () => {
  it("should combine path parameters, query parameters, and request body", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer" },
        },
        {
          name: "Authorization",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                status: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users/{id}",
      "PUT",
      operation,
    ) as Tool;

    expect(result.inputSchema).toEqual({
      type: "object",
      properties: {
        id: {
          type: "string",
          "x-parameter-location": "path",
        },
        limit: {
          type: "integer",
          "x-parameter-location": "query",
        },
        Authorization: {
          type: "string",
          "x-parameter-location": "header",
        },
        name: { type: "string" },
        status: { type: "string" },
      },
      required: ["id", "Authorization", "name"],
      additionalProperties: false,
    });
  });

  it("should handle name conflicts between parameters and body properties", () => {
    const operation: IOperation = {
      parameters: [
        {
          name: "name",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    // The body property should overwrite the parameter property
    expect(result.inputSchema.properties!.name).toEqual({ type: "string" });
    expect(result.inputSchema.required).toContain("name");
  });
});

describe("createMetaTools", () => {
  it("should create all meta-tools with correct structure", () => {
    const metaTools = createMetaTools();

    expect(metaTools).toHaveLength(3);

    expect(metaTools[0]).toEqual({
      name: "list-api-endpoints",
      description:
        "List all available API endpoints from the OpenAPI specification",
      inputSchema: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description: "Filter endpoints by OpenAPI tag",
          },
          method: {
            type: "string",
            description: "Filter endpoints by HTTP method",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
          },
        },
        additionalProperties: false,
      },
      toolId: "meta::list-endpoints",
    });

    expect(metaTools[1]).toEqual({
      name: "get-api-endpoint-schema",
      description:
        "Get detailed schema information for a specific API endpoint",
      inputSchema: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description: "The tool ID of the endpoint to get schema for",
          },
        },
        required: ["toolId"],
        additionalProperties: false,
      },
      toolId: "meta::get-endpoint-schema",
    });

    expect(metaTools[2]).toEqual({
      name: "invoke-api-endpoint",
      description:
        "Invoke any API endpoint directly by tool ID with parameters",
      inputSchema: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description: "The tool ID of the endpoint to invoke",
          },
          parameters: {
            type: "object",
            description: "Parameters to pass to the endpoint",
            additionalProperties: true,
          },
        },
        required: ["toolId"],
        additionalProperties: false,
      },
      toolId: "meta::invoke-endpoint",
    });
  });

  it("should return the same meta-tools on multiple calls", () => {
    const metaTools1 = createMetaTools();
    const metaTools2 = createMetaTools();

    expect(metaTools1).toEqual(metaTools2);
  });
});

describe("edge cases and error handling", () => {
  it("should handle empty operation", () => {
    const operation: IOperation = {
      responses: {},
    };

    expect(() =>
      createToolFromOperation("/api/test", "GET", operation),
    ).not.toThrow();
  });

  it("should handle operation with empty parameters array", () => {
    const operation: IOperation = {
      parameters: [],
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/test",
      "GET",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties).toEqual({});
    expect(result.inputSchema.required).toEqual([]);
  });

  it("should handle operation with null/undefined properties", () => {
    const operation: IOperation = {
      operationId: undefined,
      summary: null as any,
      description: undefined,
      tags: undefined,
      parameters: undefined,
      requestBody: undefined,
      responses: { "200": { description: "Success" } },
    };

    expect(() =>
      createToolFromOperation("/api/test", "GET", operation),
    ).not.toThrow();
  });

  it("should handle complex schema references", () => {
    const operation: IOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/User",
            },
          },
        },
      },
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties!.body).toEqual({
      $ref: "#/components/schemas/User",
    });
  });

  it("should handle request body with no content", () => {
    const operation: IOperation = {
      requestBody: {
        description: "Empty body",
      } as any,
      responses: { "200": { description: "Success" } },
    };

    const result = createToolFromOperation(
      "/api/users",
      "POST",
      operation,
    ) as Tool;

    expect(result.inputSchema.properties).toEqual({});
  });
});
