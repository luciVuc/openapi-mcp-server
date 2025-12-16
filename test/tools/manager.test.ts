/**
 * Tests for Tools Manager
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolsManager } from "../../src/tools/manager";
import { OpenAPISpecLoader } from "../../src/openapi/spec-loader";
import {
  createToolFromOperation,
  createMetaTools,
} from "../../src/tools/creation";
import { IToolsFilter, ITool, IOperation } from "../../src/types";
import { logger } from "../../src/utils/logger";

// Mock dependencies
jest.mock("../../src/openapi/spec-loader");
jest.mock("../../src/tools/creation");
jest.mock("../../src/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockedSpecLoader = OpenAPISpecLoader as jest.MockedClass<
  typeof OpenAPISpecLoader
>;
const mockedCreateToolFromOperation =
  createToolFromOperation as jest.MockedFunction<
    typeof createToolFromOperation
  >;
const mockedCreateMetaTools = createMetaTools as jest.MockedFunction<
  typeof createMetaTools
>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("ToolsManager", () => {
  let toolsManager: ToolsManager;
  let mockSpecLoader: jest.Mocked<OpenAPISpecLoader>;

  const mockMetaTools: ITool[] = [
    {
      name: "list_operations",
      description: "List all available API operations",
      inputSchema: {
        type: "object",
        properties: {},
      },
      toolId: "meta::list_operations",
      method: "GET",
      tags: ["meta"],
    } as ITool,
    {
      name: "get_schema",
      description: "Get tool schema by ID",
      inputSchema: {
        type: "object",
        properties: {
          toolId: { type: "string" },
        },
        required: ["toolId"],
      },
      toolId: "meta::get_schema",
      method: "GET",
      tags: ["meta"],
    } as ITool,
  ];

  const mockOperations = [
    {
      path: "/users",
      method: "GET",
      operation: {
        operationId: "getUsers",
        summary: "Get all users",
        tags: ["users"],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "array" },
              },
            },
          },
        },
      } as IOperation,
    },
    {
      path: "/users/{id}",
      method: "GET",
      operation: {
        operationId: "getUserById",
        summary: "Get user by ID",
        tags: ["users"],
        parameters: [
          {
            name: "id",
            in: "path" as const,
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      } as IOperation,
    },
    {
      path: "/users",
      method: "POST",
      operation: {
        operationId: "createUser",
        summary: "Create a new user",
        tags: ["users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
                required: ["name", "email"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      } as IOperation,
    },
    {
      path: "/orders",
      method: "GET",
      operation: {
        operationId: "getOrders",
        summary: "Get all orders",
        tags: ["orders"],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "array" },
              },
            },
          },
        },
      } as IOperation,
    },
  ];

  const mockTools: ITool[] = [
    {
      name: "get_users",
      description: "Get all users",
      inputSchema: { type: "object", properties: {} },
      toolId: "GET::users",
      method: "GET",
      resourceName: "users",
      originalPath: "/users",
      tags: ["users"],
    } as ITool,
    {
      name: "get_user_by_id",
      description: "Get user by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      toolId: "GET::users___id",
      method: "GET",
      resourceName: "users",
      originalPath: "/users/{id}",
      tags: ["users"],
    } as ITool,
    {
      name: "create_user",
      description: "Create a new user",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      },
      toolId: "POST::users",
      method: "POST",
      resourceName: "users",
      originalPath: "/users",
      tags: ["users"],
    } as ITool,
    {
      name: "get_orders",
      description: "Get all orders",
      inputSchema: { type: "object", properties: {} },
      toolId: "GET::orders",
      method: "GET",
      resourceName: "orders",
      originalPath: "/orders",
      tags: ["orders"],
    } as ITool,
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock spec loader
    mockSpecLoader = new mockedSpecLoader() as jest.Mocked<OpenAPISpecLoader>;
    mockSpecLoader.getOperations.mockReturnValue(mockOperations);

    // Setup mock creation functions
    mockedCreateMetaTools.mockReturnValue(mockMetaTools);
    mockedCreateToolFromOperation.mockImplementation(
      (path, method, operation) => {
        return mockTools.find(
          (tool) =>
            tool.originalPath === path && tool.method === method.toUpperCase(),
        )!;
      },
    );

    toolsManager = new ToolsManager(mockSpecLoader, false);
  });

  describe("constructor", () => {
    it("should initialize with spec loader and abbreviation setting", () => {
      const manager = new ToolsManager(mockSpecLoader, true);
      expect(manager).toBeInstanceOf(ToolsManager);
    });

    it("should create meta tools on initialization", () => {
      expect(mockedCreateMetaTools).toHaveBeenCalled();
    });
  });

  describe("loadTools", () => {
    describe("dynamic mode", () => {
      it("should load only meta-tools in dynamic mode", async () => {
        const filter: IToolsFilter = { mode: "dynamic" };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        expect(tools).toHaveLength(2);
        expect(tools.every((tool) => tool.toolId?.startsWith("meta::"))).toBe(
          true,
        );
        expect(mockedLogger.info).toHaveBeenCalledWith(
          "Loading tools with mode: dynamic",
        );
        expect(mockedLogger.info).toHaveBeenCalledWith("Loaded 2 tools");
      });
    });

    describe("explicit mode", () => {
      it("should load meta-tools and specified tools", async () => {
        const filter: IToolsFilter = {
          mode: "explicit",
          includeTools: ["GET::users", "POST::users"],
        };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        expect(tools).toHaveLength(4); // 2 meta + 2 explicit

        const toolIds = tools.map((tool) => tool.toolId);
        expect(toolIds).toContain("meta::list_operations");
        expect(toolIds).toContain("meta::get_schema");
        expect(toolIds).toContain("GET::users");
        expect(toolIds).toContain("POST::users");
      });

      it("should warn about non-existent tools", async () => {
        const filter: IToolsFilter = {
          mode: "explicit",
          includeTools: ["INVALID::tool"],
        };

        await toolsManager.loadTools(filter);

        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "Tool not found for ID: INVALID::tool",
        );
      });
    });

    describe("all mode", () => {
      it("should load all tools without filters", async () => {
        const filter: IToolsFilter = { mode: "all" };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        expect(tools).toHaveLength(6); // 2 meta + 4 endpoint tools
      });

      it("should filter by tags", async () => {
        const filter: IToolsFilter = {
          mode: "all",
          includeTags: ["users"],
        };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        const endpointTools = tools.filter(
          (tool) => !tool.toolId?.startsWith("meta::"),
        );
        expect(endpointTools).toHaveLength(3); // 3 user-related tools
        expect(
          endpointTools.every((tool) => tool.tags?.includes("users")),
        ).toBe(true);
      });

      it("should filter by operations (HTTP methods)", async () => {
        const filter: IToolsFilter = {
          mode: "all",
          includeOperations: ["GET"],
        };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        const endpointTools = tools.filter(
          (tool) => !tool.toolId?.startsWith("meta::"),
        );
        expect(endpointTools.every((tool) => tool.method === "GET")).toBe(true);
      });

      it("should filter by resources", async () => {
        const filter: IToolsFilter = {
          mode: "all",
          includeResources: ["users"],
        };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        const endpointTools = tools.filter(
          (tool) => !tool.toolId?.startsWith("meta::"),
        );
        expect(
          endpointTools.every(
            (tool) =>
              tool.originalPath?.includes("users") ||
              tool.resourceName === "users",
          ),
        ).toBe(true);
      });

      it("should apply multiple filters", async () => {
        const filter: IToolsFilter = {
          mode: "all",
          includeTags: ["users"],
          includeOperations: ["GET"],
        };

        await toolsManager.loadTools(filter);

        const tools = toolsManager.getTools();
        const endpointTools = tools.filter(
          (tool) => !tool.toolId?.startsWith("meta::"),
        );
        expect(endpointTools).toHaveLength(2); // GET /users and GET /users/{id}
        expect(
          endpointTools.every(
            (tool) => tool.method === "GET" && tool.tags?.includes("users"),
          ),
        ).toBe(true);
      });
    });
  });

  describe("tool retrieval", () => {
    beforeEach(async () => {
      const filter: IToolsFilter = { mode: "all" };
      await toolsManager.loadTools(filter);
    });

    it("should get all tools", () => {
      const tools = toolsManager.getTools();
      expect(tools).toHaveLength(6);
    });

    it("should get tool by name", () => {
      const tool = toolsManager.getToolByName("get_users") as Tool;
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("get_users");
    });

    it("should return undefined for non-existent tool name", () => {
      const tool = toolsManager.getToolByName("non_existent");
      expect(tool).toBeUndefined();
    });

    it("should get tool by ID", () => {
      const tool = toolsManager.getToolById("GET::users") as Tool;
      expect(tool).toBeDefined();
      expect(tool?.toolId).toBe("GET::users");
    });

    it("should return undefined for non-existent tool ID", () => {
      const tool = toolsManager.getToolById("INVALID::tool");
      expect(tool).toBeUndefined();
    });
  });

  describe("meta-tool identification", () => {
    it("should identify meta-tools correctly", () => {
      expect(toolsManager.isMetaTool("meta::list_operations")).toBe(true);
      expect(toolsManager.isMetaTool("meta::get_schema")).toBe(true);
      expect(toolsManager.isMetaTool("GET::users")).toBe(false);
    });
  });

  describe("listOperations", () => {
    it("should list all operations without filter", () => {
      const operations = toolsManager.listOperations();
      expect(operations).toHaveLength(4);
      expect(operations[0]).toEqual({
        path: "/users",
        method: "GET",
        operationId: "getUsers",
        summary: "Get all users",
        tags: ["users"],
      });
    });

    it("should filter operations by tag", () => {
      const operations = toolsManager.listOperations({ tag: "users" });
      expect(operations).toHaveLength(3);
      expect(operations.every((op) => op.tags?.includes("users"))).toBe(true);
    });

    it("should filter operations by method", () => {
      const operations = toolsManager.listOperations({ method: "GET" });
      expect(operations).toHaveLength(3);
      expect(operations.every((op) => op.method === "GET")).toBe(true);
    });

    it("should filter operations by both tag and method", () => {
      const operations = toolsManager.listOperations({
        tag: "users",
        method: "GET",
      });
      expect(operations).toHaveLength(2);
      expect(
        operations.every(
          (op) => op.method === "GET" && op.tags?.includes("users"),
        ),
      ).toBe(true);
    });
  });

  describe("getToolSchema", () => {
    beforeEach(async () => {
      const filter: IToolsFilter = { mode: "all" };
      await toolsManager.loadTools(filter);
    });

    it("should get tool schema by ID", () => {
      const schema = toolsManager.getToolSchema("GET::users");
      expect(schema).toEqual({
        toolId: "GET::users",
        name: "get_users",
        description: "Get all users",
        inputSchema: { type: "object", properties: {} },
        method: "GET",
        resourceName: "users",
        originalPath: "/users",
        tags: ["users"],
      });
    });

    it("should throw error for non-existent tool", () => {
      expect(() => toolsManager.getToolSchema("INVALID::tool")).toThrow(
        "Tool not found: INVALID::tool",
      );
    });
  });

  describe("getStats", () => {
    beforeEach(async () => {
      const filter: IToolsFilter = { mode: "all" };
      await toolsManager.loadTools(filter);
    });

    it("should provide accurate statistics", () => {
      const stats = toolsManager.getStats();

      expect(stats.total).toBe(6);
      expect(stats.metaTools).toBe(2);
      expect(stats.endpointTools).toBe(4);

      expect(stats.byMethod.GET).toBe(5); // 2 meta + 3 endpoint GET tools
      expect(stats.byMethod.POST).toBe(1);

      expect(stats.byResource.users).toBe(3);
      expect(stats.byResource.orders).toBe(1);

      expect(stats.byTag.meta).toBe(2);
      expect(stats.byTag.users).toBe(3);
      expect(stats.byTag.orders).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty operations list", async () => {
      mockSpecLoader.getOperations.mockReturnValue([]);

      const filter: IToolsFilter = { mode: "all" };
      await toolsManager.loadTools(filter);

      const tools = toolsManager.getTools();
      expect(tools).toHaveLength(2); // Only meta-tools
    });

    it("should handle tools without tags gracefully", async () => {
      const operationsWithoutTags = [
        {
          path: "/health",
          method: "GET",
          operation: {
            operationId: "healthCheck",
            summary: "Health check",
            responses: { "200": { description: "OK" } },
          },
        },
      ];

      mockSpecLoader.getOperations.mockReturnValue(operationsWithoutTags);

      const healthTool: ITool = {
        name: "health_check",
        description: "Health check",
        inputSchema: { type: "object", properties: {} },
        toolId: "GET::health",
        method: "GET",
        resourceName: "health",
        originalPath: "/health",
      } as ITool;

      mockedCreateToolFromOperation.mockReturnValue(healthTool);

      const filter: IToolsFilter = { mode: "all" };
      await toolsManager.loadTools(filter);

      const stats = toolsManager.getStats();
      expect(stats.total).toBe(3); // 2 meta + 1 endpoint
    });

    it("should handle abbreviation setting correctly", () => {
      const managerWithAbbreviation = new ToolsManager(mockSpecLoader, true);
      expect(managerWithAbbreviation).toBeInstanceOf(ToolsManager);
    });
  });
});
