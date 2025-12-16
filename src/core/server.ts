/**
 * OpenAPI MCP Server - Main Server Implementation
 *
 * This is the core server class that orchestrates all components of the OpenAPI MCP Server.
 * It handles the complete lifecycle from configuration validation to tool execution.
 *
 * ## Key Responsibilities
 *
 * 1. **Configuration Management**: Validates and normalizes server configuration
 * 2. **Component Orchestration**: Initializes and coordinates all server components
 * 3. **MCP Protocol Handling**: Implements MCP request/response handlers
 * 4. **Authentication Setup**: Configures static or dynamic authentication
 * 5. **Transport Management**: Sets up stdio or HTTP transport layers
 * 6. **Tool Lifecycle**: Manages tool loading, filtering, and execution
 * 7. **Meta-Tool Support**: Provides dynamic API exploration capabilities
 *
 * ## Architecture
 *
 * ```
 * OpenAPIServer
 * ├── Configuration (validateConfig)
 * ├── OpenAPISpecLoader (loads & parses OpenAPI specs)
 * ├── ToolsManager (creates & filters tools)
 * ├── ApiClient (executes authenticated HTTP requests)
 * ├── TransportHandler (stdio/HTTP transport)
 * └── MCP Handlers (list tools, call tools)
 * ```
 *
 * ## Tool Execution Flow
 *
 * 1. **Tool Discovery**: Client calls `tools/list` to get available tools
 * 2. **Tool Execution**: Client calls `tools/call` with tool name and parameters
 * 3. **Parameter Processing**: Server maps parameters to OpenAPI operation format
 * 4. **API Call**: Server executes authenticated HTTP request to target API
 * 5. **Response Processing**: Server formats API response for MCP client
 *
 * ## Meta-Tools
 *
 * The server provides three built-in meta-tools for dynamic API exploration:
 *
 * - `list-api-endpoints`: Lists all available API endpoints with filtering
 * - `get-api-endpoint-schema`: Gets detailed schema for specific endpoints
 * - `invoke-api-endpoint`: Directly invokes any endpoint by tool ID
 *
 * @example Basic Server Setup
 * ```typescript
 * const server = new OpenAPIServer({
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: 'https://api.example.com/openapi.json',
 *   transportType: 'stdio'
 * });
 *
 * await server.start();
 * ```
 *
 * @example Advanced Configuration
 * ```typescript
 * const server = new OpenAPIServer({
 *   name: 'my-api-server',
 *   apiBaseUrl: 'https://api.example.com',
 *   openApiSpec: './api-spec.yaml',
 *   specInputMethod: 'file',
 *   authProvider: new MyAuthProvider(),
 *   transportType: 'http',
 *   httpPort: 3000,
 *   toolsMode: 'all',
 *   includeTags: ['users', 'posts'],
 *   includeOperations: ['GET', 'POST'],
 *   debug: true
 * });
 *
 * await server.start();
 * ```
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { validateConfig } from "./config";
import { OpenAPISpecLoader } from "../openapi/spec-loader";
import { ToolsManager } from "../tools/manager";
import { ApiClient } from "../api/client";
import { createTransportHandler } from "../transport";
import { logger, setDebugMode } from "../utils/logger";
import { StaticAuthProvider } from "../auth/providers";
import {
  IAuthProvider,
  IOpenAPIServerConfig,
  ITransportHandler,
  IToolsFilter,
} from "../types";

/**
 * OpenAPI MCP Server
 */
export class OpenAPIServer {
  private server: Server;
  private specLoader: OpenAPISpecLoader;
  private toolsManager: ToolsManager;
  private apiClient: ApiClient;
  private transportHandler: ITransportHandler | null = null;
  private config: IOpenAPIServerConfig;

  constructor(config: IOpenAPIServerConfig) {
    this.config = validateConfig(config);

    // Set debug mode
    if (this.config.debug) {
      setDebugMode(true);
    }

    // Initialize core components
    this.server = new Server(
      {
        name: this.config.name!,
        version: this.config.version!,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.specLoader = new OpenAPISpecLoader();
    this.toolsManager = new ToolsManager(
      this.specLoader,
      this.config.disableAbbreviation,
      this.config.namespace,
    );

    // Initialize API client with authentication
    const authProvider = this.createAuthProvider();
    this.apiClient = new ApiClient(this.config.apiBaseUrl, authProvider);

    // Set up MCP handlers
    this.setupMCPHandlers();

    logger.info(
      `Initialized OpenAPI MCP Server: ${this.config.name} v${this.config.version}`,
    );
  }

  /**
   * Create authentication provider based on configuration
   */
  private createAuthProvider(): IAuthProvider | undefined {
    if (this.config.authProvider) {
      return this.config.authProvider;
    }

    if (this.config.headers) {
      return new StaticAuthProvider(this.config.headers);
    }

    return undefined;
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupMCPHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolsManager.getTools();

      logger.debug(`Listing ${tools.length} tools`);

      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.debug(`Calling tool: ${name}`);

      try {
        // Find the tool
        const tool = this.toolsManager.getToolByName(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        // Handle meta-tools
        if (this.toolsManager.isMetaTool(tool.toolId || "")) {
          return await this.handleMetaTool(tool.toolId!, args || {});
        }

        // Handle regular API tools
        if (!tool.toolId) {
          throw new Error(`Tool ${name} has no tool ID`);
        }

        const result = await this.apiClient.executeApiCall({
          toolId: tool.toolId,
          parameters: args || {},
          headers: this.config.headers,
        });

        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${result.error}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        logger.error(
          `Tool execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `Error executing tool: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle meta-tool execution
   */
  private async handleMetaTool(
    toolId: string,
    args: Record<string, any>,
  ): Promise<any> {
    switch (toolId) {
      case "meta::list-endpoints":
        return this.handleListEndpoints(args);
      case "meta::get-endpoint-schema":
        return this.handleGetEndpointSchema(args);
      case "meta::invoke-endpoint":
        return this.handleInvokeEndpoint(args);
      default:
        throw new Error(`Unknown meta-tool: ${toolId}`);
    }
  }

  /**
   * Handle list-endpoints meta-tool
   */
  private async handleListEndpoints(args: Record<string, any>): Promise<any> {
    const operations = this.toolsManager.listOperations({
      tag: args.tag,
      method: args.method,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              endpoints: operations,
              total: operations.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle get-endpoint-schema meta-tool
   */
  private async handleGetEndpointSchema(
    args: Record<string, any>,
  ): Promise<any> {
    if (!args.toolId) {
      throw new Error("toolId parameter is required");
    }

    const schema = this.toolsManager.getToolSchema(args.toolId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  /**
   * Handle invoke-endpoint meta-tool
   */
  private async handleInvokeEndpoint(args: Record<string, any>): Promise<any> {
    if (!args.toolId) {
      throw new Error("toolId parameter is required");
    }

    const result = await this.apiClient.executeApiCall({
      toolId: args.toolId,
      parameters: args.parameters || {},
      headers: this.config.headers,
    });

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: result.data,
                statusCode: result.statusCode,
                headers: result.headers,
              },
              null,
              2,
            ),
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: result.error,
                statusCode: result.statusCode,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      logger.info("Starting OpenAPI MCP Server...");

      // Load OpenAPI specification
      await this.loadOpenAPISpec();

      // Load tools based on configuration
      await this.loadTools();

      // Create and start transport
      this.transportHandler = await createTransportHandler(this.server, {
        type: this.config.transportType!,
        httpPort: this.config.httpPort,
        httpHost: this.config.httpHost,
        endpointPath: this.config.endpointPath,
      });

      if (!this.transportHandler) {
        throw new Error("Failed to create transport handler");
      }

      await this.transportHandler.start();

      // Log statistics
      const stats = this.toolsManager.getStats();
      logger.info(
        `Server started successfully with ${stats.total} tools (${stats.endpointTools} endpoint tools, ${stats.metaTools} meta tools)`,
      );

      if (this.config.debug) {
        logger.debug("Tool statistics:", stats);
      }
    } catch (error) {
      logger.error(
        `Failed to start server: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    logger.info("Stopping OpenAPI MCP Server...");

    if (this.transportHandler) {
      await this.transportHandler.stop();
      this.transportHandler = null;
    }

    logger.info("Server stopped");
  }

  /**
   * Load OpenAPI specification
   */
  private async loadOpenAPISpec(): Promise<void> {
    const method = this.config.specInputMethod!;
    let specSource = this.config.openApiSpec || "";

    // Handle stdin input method
    if (method === "stdin") {
      // For stdin, we don't need a specSource
      specSource = "";
    }

    logger.debug(`Loading OpenAPI spec using method: ${method}`);
    await this.specLoader.loadSpec(specSource, method);

    const spec = this.specLoader.getSpec();
    logger.info(
      `Loaded OpenAPI spec: ${spec.info.title} v${spec.info.version}`,
    );
  }

  /**
   * Load tools based on configuration
   */
  private async loadTools(): Promise<void> {
    const filter: IToolsFilter = {
      mode: this.config.toolsMode!,
      includeTools: this.config.includeTools,
      includeTags: this.config.includeTags,
      includeResources: this.config.includeResources,
      includeOperations: this.config.includeOperations,
    };

    await this.toolsManager.loadTools(filter);
  }

  /**
   * Get server statistics
   */
  getStats(): any {
    const hasSpec = this.specLoader.isLoaded();

    if (!hasSpec) {
      return {
        server: {
          name: this.config.name,
          version: this.config.version,
          transport: this.config.transportType,
          apiBaseUrl: this.config.apiBaseUrl,
        },
        tools: {
          total: 0,
          metaTools: 0,
          endpointTools: 0,
          byMethod: {},
          byResource: {},
          byTag: {},
        },
        spec: {
          title: "Not loaded",
          version: "Not loaded",
          operations: 0,
          tags: 0,
        },
      };
    }

    const spec = this.specLoader.getSpec();

    return {
      server: {
        name: this.config.name,
        version: this.config.version,
        transport: this.config.transportType,
        apiBaseUrl: this.config.apiBaseUrl,
      },
      tools: this.toolsManager.getStats(),
      spec: {
        title: spec.info.title,
        version: spec.info.version,
        operations: this.specLoader.getOperations().length,
        tags: this.specLoader.getTags().length,
      },
    };
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    return await this.apiClient.testConnection();
  }
}

export default OpenAPIServer;
