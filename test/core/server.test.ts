// Import mocked modules
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { OpenAPISpecLoader } from "../../src/openapi/spec-loader";
import { ToolsManager } from "../../src/tools/manager";
import { ApiClient } from "../../src/api/client";
import { createTransportHandler } from "../../src/transport";
import { logger, setDebugMode } from "../../src/utils/logger";
import { OpenAPIServer } from "../../src/core/server";
import { IOpenAPIServerConfig, ITool } from "../../src/types";
import { StaticAuthProvider } from "../../src/auth/providers";

// Mock all dependencies
jest.mock("@modelcontextprotocol/sdk/server/index.js");
jest.mock("../../src/openapi/spec-loader");
jest.mock("../../src/tools/manager");
jest.mock("../../src/api/client");
jest.mock("../../src/transport");
jest.mock("../../src/utils/logger");
jest.mock("../../src/auth/providers");

const MockedServer = Server as jest.MockedClass<typeof Server>;
const MockedStaticAuthProvider = StaticAuthProvider as jest.MockedClass<
  typeof StaticAuthProvider
>;
const MockedOpenAPISpecLoader = OpenAPISpecLoader as jest.MockedClass<
  typeof OpenAPISpecLoader
>;
const MockedToolsManager = ToolsManager as jest.MockedClass<
  typeof ToolsManager
>;
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const mockedCreateTransportHandler =
  createTransportHandler as jest.MockedFunction<typeof createTransportHandler>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedSetDebugMode = setDebugMode as jest.MockedFunction<
  typeof setDebugMode
>;

describe("OpenAPI Server", () => {
  let mockServer: jest.Mocked<Server>;
  let mockSpecLoader: jest.Mocked<OpenAPISpecLoader>;
  let mockToolsManager: jest.Mocked<ToolsManager>;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockTransportHandler: any;

  const basicConfig: IOpenAPIServerConfig = {
    apiBaseUrl: "https://api.example.com",
    openApiSpec: "https://api.example.com/openapi.json",
    transportType: "stdio",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked instances
    mockServer = {
      setRequestHandler: jest.fn(),
    } as any;

    mockSpecLoader = {
      loadSpec: jest.fn(),
      getSpec: jest.fn().mockReturnValue({
        info: { title: "Test API", version: "1.0.0" },
      }),
      getOperations: jest.fn().mockReturnValue([]),
      getTags: jest.fn().mockReturnValue([]),
      isLoaded: jest.fn().mockReturnValue(true),
    } as any;

    mockToolsManager = {
      loadTools: jest.fn(),
      getTools: jest.fn().mockReturnValue([]),
      getToolByName: jest.fn(),
      isMetaTool: jest.fn(),
      getToolSchema: jest.fn(),
      listOperations: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        total: 5,
        metaTools: 3,
        endpointTools: 2,
        byMethod: {},
        byResource: {},
        byTag: {},
      }),
    } as any;

    mockApiClient = {
      executeApiCall: jest.fn(),
      testConnection: jest.fn().mockResolvedValue(true),
    } as any;

    mockTransportHandler = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    // Setup constructor mocks
    MockedServer.mockImplementation(() => mockServer);
    MockedOpenAPISpecLoader.mockImplementation(() => mockSpecLoader);
    MockedToolsManager.mockImplementation(() => mockToolsManager);
    MockedApiClient.mockImplementation(() => mockApiClient);
    mockedCreateTransportHandler.mockResolvedValue(mockTransportHandler);
  });

  describe("Constructor", () => {
    it("should create a server instance with basic config", () => {
      const server = new OpenAPIServer(basicConfig);

      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(OpenAPIServer);
      expect(MockedServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "openapi-mcp-server",
          version: "1.0.0",
        }),
        expect.objectContaining({
          capabilities: { tools: {} },
        }),
      );
    });

    it("should use custom name and version when provided", () => {
      const config = {
        ...basicConfig,
        name: "my-custom-server",
        version: "2.0.0",
      };

      new OpenAPIServer(config);

      expect(MockedServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-custom-server",
          version: "2.0.0",
        }),
        expect.anything(),
      );
    });

    it("should enable debug mode when debug flag is set", () => {
      const config = { ...basicConfig, debug: true };

      new OpenAPIServer(config);

      expect(mockedSetDebugMode).toHaveBeenCalledWith(true);
    });

    it("should create StaticAuthProvider when headers are provided", () => {
      const config = {
        ...basicConfig,
        headers: { Authorization: "Bearer token123" },
      };

      new OpenAPIServer(config);

      expect(MockedStaticAuthProvider).toHaveBeenCalledWith({
        Authorization: "Bearer token123",
      });
    });

    it("should use provided authProvider over headers", () => {
      const mockAuthProvider = new StaticAuthProvider({});
      const config = {
        ...basicConfig,
        headers: { Authorization: "Bearer token123" },
        authProvider: mockAuthProvider,
      };

      new OpenAPIServer(config);

      expect(MockedApiClient).toHaveBeenCalledWith(
        "https://api.example.com",
        mockAuthProvider,
      );
    });

    it("should setup MCP handlers during construction", () => {
      new OpenAPIServer(basicConfig);

      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("Methods Availability", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should have all required methods", () => {
      expect(typeof server.start).toBe("function");
      expect(typeof server.stop).toBe("function");
      expect(typeof server.getStats).toBe("function");
      expect(typeof server.testConnection).toBe("function");
    });
  });

  describe("start()", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should start successfully with valid configuration", async () => {
      await server.start();

      expect(mockSpecLoader.loadSpec).toHaveBeenCalledWith(
        "https://api.example.com/openapi.json",
        "url",
      );
      expect(mockToolsManager.loadTools).toHaveBeenCalled();
      expect(mockedCreateTransportHandler).toHaveBeenCalled();
      expect(mockTransportHandler.start).toHaveBeenCalled();
    });

    it("should handle stdin input method", async () => {
      const stdinConfig = {
        ...basicConfig,
        specInputMethod: "stdin" as const,
      };
      server = new OpenAPIServer(stdinConfig);

      await server.start();

      expect(mockSpecLoader.loadSpec).toHaveBeenCalledWith("", "stdin");
    });

    it("should throw error if transport handler creation fails", async () => {
      mockedCreateTransportHandler.mockResolvedValue(null as any);

      await expect(server.start()).rejects.toThrow(
        "Failed to create transport handler",
      );
    });

    it("should propagate spec loading errors", async () => {
      const error = new Error("Invalid OpenAPI spec");
      mockSpecLoader.loadSpec.mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow("Invalid OpenAPI spec");
    });

    it("should propagate transport start errors", async () => {
      const error = new Error("Transport failed to start");
      mockTransportHandler.start.mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow("Transport failed to start");
    });
  });

  describe("stop()", () => {
    let server: OpenAPIServer;

    beforeEach(async () => {
      server = new OpenAPIServer(basicConfig);
      await server.start();
    });

    it("should stop the server successfully", async () => {
      await server.stop();

      expect(mockTransportHandler.stop).toHaveBeenCalled();
    });

    it("should handle stop when no transport handler exists", async () => {
      server = new OpenAPIServer(basicConfig);

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe("getStats()", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should return stats when spec is loaded", async () => {
      await server.start();

      const stats = server.getStats();

      expect(stats).toEqual({
        server: {
          name: "openapi-mcp-server",
          version: "1.0.0",
          transport: "stdio",
          apiBaseUrl: "https://api.example.com",
        },
        tools: {
          total: 5,
          metaTools: 3,
          endpointTools: 2,
          byMethod: {},
          byResource: {},
          byTag: {},
        },
        spec: {
          title: "Test API",
          version: "1.0.0",
          operations: 0,
          tags: 0,
        },
      });
    });

    it("should return default stats when spec is not loaded", () => {
      mockSpecLoader.isLoaded.mockReturnValue(false);

      const stats = server.getStats();

      expect(stats.spec.title).toBe("Not loaded");
      expect(stats.tools.total).toBe(0);
    });
  });

  describe("testConnection()", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should return true for successful connection", async () => {
      mockApiClient.testConnection.mockResolvedValue(true);

      const result = await server.testConnection();

      expect(result).toBe(true);
      expect(mockApiClient.testConnection).toHaveBeenCalled();
    });

    it("should return false for failed connection", async () => {
      mockApiClient.testConnection.mockResolvedValue(false);

      const result = await server.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("MCP Handlers", () => {
    let server: OpenAPIServer;
    let listToolsHandler: any;
    let callToolHandler: any;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);

      // Extract the handlers from the setRequestHandler calls
      const calls = mockServer.setRequestHandler.mock.calls;
      listToolsHandler = calls[0][1];
      callToolHandler = calls[1][1];
    });

    describe("List Tools Handler", () => {
      it("should list available tools", async () => {
        const mockTools: ITool[] = [
          {
            name: "getUserById",
            description: "Get user by ID",
            inputSchema: {
              type: "object" as const,
              properties: {},
            },
          } as Tool & { toolId: string },
        ];
        mockToolsManager.getTools.mockReturnValue(mockTools);

        const result = await listToolsHandler();

        expect(result).toEqual({
          tools: mockTools,
        });
        expect(mockToolsManager.getTools).toHaveBeenCalled();
      });
    });

    describe("Call Tool Handler", () => {
      const toolRequest = {
        params: {
          name: "getUserById",
          arguments: { userId: "123" },
        },
      };

      it("should handle regular API tool calls successfully", async () => {
        const mockTool: ITool = {
          name: "getUserById",
          toolId: "get:/users/{id}",
          description: "Get user by ID",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        } as Tool & { toolId: string };
        mockToolsManager.getToolByName.mockReturnValue(mockTool);
        mockToolsManager.isMetaTool.mockReturnValue(false);
        mockApiClient.executeApiCall.mockResolvedValue({
          success: true,
          data: { id: "123", name: "John Doe" },
        });

        const result = await callToolHandler(toolRequest);

        expect(result.content[0].text).toContain("John Doe");
        expect(mockToolsManager.getToolByName).toHaveBeenCalledWith(
          "getUserById",
        );
        expect(mockApiClient.executeApiCall).toHaveBeenCalledWith({
          toolId: "get:/users/{id}",
          parameters: { userId: "123" },
          headers: undefined,
        });
      });

      it("should handle API call failures", async () => {
        const mockTool: ITool = {
          name: "getUserById",
          toolId: "get:/users/{id}",
          description: "Get user by ID",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        } as Tool & { toolId: string };
        mockToolsManager.getToolByName.mockReturnValue(mockTool);
        mockToolsManager.isMetaTool.mockReturnValue(false);
        mockApiClient.executeApiCall.mockResolvedValue({
          success: false,
          error: "User not found",
        });

        const result = await callToolHandler(toolRequest);

        expect(result.content[0].text).toBe("Error: User not found");
        expect(result.isError).toBe(true);
      });

      it("should handle tool not found error", async () => {
        mockToolsManager.getToolByName.mockReturnValue(undefined);

        const result = await callToolHandler(toolRequest);

        expect(result.content[0].text).toContain("Tool not found: getUserById");
        expect(result.isError).toBe(true);
      });

      it("should handle tools without toolId", async () => {
        const mockTool: ITool = {
          name: "getUserById",
          toolId: undefined,
          description: "Get user by ID",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        } as Tool & { toolId: string | undefined };
        mockToolsManager.getToolByName.mockReturnValue(mockTool);

        const result = await callToolHandler(toolRequest);

        expect(result.content[0].text).toContain(
          "Tool getUserById has no tool ID",
        );
        expect(result.isError).toBe(true);
      });

      it("should handle meta-tool calls", async () => {
        const mockTool: ITool = {
          name: "listEndpoints",
          toolId: "meta::list-endpoints",
          description: "List API endpoints",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        } as Tool & { toolId: string };
        mockToolsManager.getToolByName.mockReturnValue(mockTool);
        mockToolsManager.isMetaTool.mockReturnValue(true);

        const result = await callToolHandler({
          params: {
            name: "listEndpoints",
            arguments: { tag: "users" },
          },
        });

        expect(result.content[0].text).toContain("endpoints");
      });

      it("should handle unexpected errors", async () => {
        mockToolsManager.getToolByName.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const result = await callToolHandler(toolRequest);

        expect(result.content[0].text).toContain(
          "Error executing tool: Unexpected error",
        );
        expect(result.isError).toBe(true);
      });
    });
  });

  describe("Meta-tool Handlers", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should handle list-endpoints meta-tool", async () => {
      const operations = [{ method: "GET", path: "/users", tags: ["users"] }];
      mockToolsManager.listOperations.mockReturnValue(operations);

      const result = await (server as any).handleListEndpoints({
        tag: "users",
      });

      expect(result.content[0].text).toContain("endpoints");
      expect(mockToolsManager.listOperations).toHaveBeenCalledWith({
        tag: "users",
        method: undefined,
      });
    });

    it("should handle get-endpoint-schema meta-tool", async () => {
      const schema = { type: "object", properties: {} };
      mockToolsManager.getToolSchema.mockReturnValue(schema);

      const result = await (server as any).handleGetEndpointSchema({
        toolId: "get:/users/{id}",
      });

      expect(result.content[0].text).toContain("object");
      expect(mockToolsManager.getToolSchema).toHaveBeenCalledWith(
        "get:/users/{id}",
      );
    });

    it("should throw error for get-endpoint-schema without toolId", async () => {
      await expect((server as any).handleGetEndpointSchema({})).rejects.toThrow(
        "toolId parameter is required",
      );
    });

    it("should handle invoke-endpoint meta-tool successfully", async () => {
      mockApiClient.executeApiCall.mockResolvedValue({
        success: true,
        data: { result: "success" },
        statusCode: 200,
        headers: {},
      });

      const result = await (server as any).handleInvokeEndpoint({
        toolId: "get:/users/{id}",
        parameters: { id: "123" },
      });

      expect(result.content[0].text).toContain("success");
      expect(result.content[0].text).toContain("200");
    });

    it("should handle invoke-endpoint meta-tool failures", async () => {
      mockApiClient.executeApiCall.mockResolvedValue({
        success: false,
        error: "API error",
        statusCode: 500,
      });

      const result = await (server as any).handleInvokeEndpoint({
        toolId: "get:/users/{id}",
        parameters: { id: "123" },
      });

      expect(result.content[0].text).toContain("API error");
      expect(result.isError).toBe(true);
    });

    it("should throw error for invoke-endpoint without toolId", async () => {
      await expect((server as any).handleInvokeEndpoint({})).rejects.toThrow(
        "toolId parameter is required",
      );
    });

    it("should throw error for unknown meta-tool", async () => {
      await expect(
        (server as any).handleMetaTool("meta::unknown", {}),
      ).rejects.toThrow("Unknown meta-tool: meta::unknown");
    });
  });

  describe("Configuration Edge Cases", () => {
    it("should handle HTTP transport configuration", () => {
      const httpConfig: IOpenAPIServerConfig = {
        ...basicConfig,
        transportType: "http",
        httpPort: 3000,
        httpHost: "localhost",
        endpointPath: "/api",
      };

      const server = new OpenAPIServer(httpConfig);
      expect(server).toBeDefined();
    });

    it("should handle all tools mode configuration", () => {
      const allToolsConfig: IOpenAPIServerConfig = {
        ...basicConfig,
        toolsMode: "all",
        includeTags: ["users", "posts"],
        includeOperations: ["GET", "POST"],
        includeResources: ["/users", "/posts"],
      };

      const server = new OpenAPIServer(allToolsConfig);
      expect(server).toBeDefined();
    });

    it("should handle file input method", () => {
      const fileConfig: IOpenAPIServerConfig = {
        ...basicConfig,
        openApiSpec: "./spec.yaml",
        specInputMethod: "file",
      };

      const server = new OpenAPIServer(fileConfig);
      expect(server).toBeDefined();
    });

    it("should handle disabled abbreviation", () => {
      const config: IOpenAPIServerConfig = {
        ...basicConfig,
        disableAbbreviation: true,
      };

      new OpenAPIServer(config);

      expect(MockedToolsManager).toHaveBeenCalledWith(
        expect.anything(),
        true,
        undefined,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid configuration", () => {
      expect(() => {
        new OpenAPIServer({} as IOpenAPIServerConfig);
      }).toThrow();
    });
  });

  describe("Authentication Provider Creation", () => {
    it("should create no auth provider when neither headers nor authProvider provided", () => {
      const config = {
        apiBaseUrl: "https://api.example.com",
        openApiSpec: "https://api.example.com/openapi.json",
        transportType: "stdio" as const,
      };

      new OpenAPIServer(config);

      expect(MockedApiClient).toHaveBeenCalledWith(
        "https://api.example.com",
        undefined,
      );
    });
  });

  describe("Lifecycle Integration", () => {
    let server: OpenAPIServer;

    beforeEach(() => {
      server = new OpenAPIServer(basicConfig);
    });

    it("should support full start-stop-start cycle", async () => {
      await server.start();
      await server.stop();
      await server.start();

      expect(mockTransportHandler.start).toHaveBeenCalledTimes(2);
      expect(mockTransportHandler.stop).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple consecutive starts gracefully", async () => {
      await server.start();
      await server.start();

      expect(mockTransportHandler.start).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple consecutive stops gracefully", async () => {
      await server.start();
      await server.stop();
      await server.stop();

      // Second stop should be safe even if transport handler is null
      expect(mockTransportHandler.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe("Component Integration", () => {
    it("should pass correct parameters to ToolsManager loadTools", async () => {
      const config: IOpenAPIServerConfig = {
        ...basicConfig,
        toolsMode: "all",
        includeTools: ["tool1", "tool2"],
        includeTags: ["tag1"],
        includeResources: ["/resource1"],
        includeOperations: ["GET", "POST"],
      };

      const server = new OpenAPIServer(config);
      await server.start();

      expect(mockToolsManager.loadTools).toHaveBeenCalledWith({
        mode: "all",
        includeTools: ["tool1", "tool2"],
        includeTags: ["tag1"],
        includeResources: ["/resource1"],
        includeOperations: ["GET", "POST"],
      });
    });

    it("should pass correct parameters to createTransportHandler", async () => {
      const config: IOpenAPIServerConfig = {
        ...basicConfig,
        transportType: "http",
        httpPort: 4000,
        httpHost: "0.0.0.0",
        endpointPath: "/custom",
      };

      const server = new OpenAPIServer(config);
      await server.start();

      expect(mockedCreateTransportHandler).toHaveBeenCalledWith(mockServer, {
        type: "http",
        httpPort: 4000,
        httpHost: "0.0.0.0",
        endpointPath: "/custom",
      });
    });
  });
});
