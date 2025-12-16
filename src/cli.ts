#!/usr/bin/env node

/**
 * Command-line interface for OpenAPI MCP Server
 */

import { Command } from "commander";
import { OpenAPIServer } from "./core/server";
import { IOpenAPIServerConfig, SpecInputMethod } from "./types";
import { logger } from "./utils/logger";
import dotenv from "dotenv";
import packageJson from "../package.json";

dotenv.config({
  quiet: true,
});

/**
 * Parse command line arguments and start the server
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name("openapi-mcp-server")
    .description("OpenAPI MCP Server - Expose OpenAPI endpoints as MCP tools")
    .version(packageJson.version, "-v, --version", "display version number")
    .helpOption("-h, --help", "display help for command");

  // API configuration options
  program.option("--api-base-url <url>", "Base URL for the API endpoints");

  // OpenAPI spec options
  program
    .option(
      "--openapi-spec <path-or-url>",
      "Path or URL to OpenAPI specification",
    )
    .option("--spec-from-stdin", "Read OpenAPI spec from standard input")
    .option("--spec-inline <content>", "Provide OpenAPI spec content directly");

  // Authentication options
  program.option(
    "--headers <headers>",
    "Comma-separated key:value pairs for API headers",
    (value) => {
      const headers: Record<string, string> = {};
      value.split(",").forEach((pair) => {
        const [key, ...valueParts] = pair.split(":");
        if (key && valueParts.length > 0) {
          headers[key.trim()] = valueParts.join(":").trim();
        }
      });
      return headers;
    },
  );

  // Server options
  program
    .option(
      "--server-name <name>",
      "Name for the MCP server",
      "openapi-mcp-server",
    )
    .option(
      "--server-version <version>",
      "Version of the server",
      packageJson.version,
    );

  // Transport options
  program
    .option("--transport <type>", "Transport type: stdio or http")
    .option(
      "--port <port>",
      "Port for HTTP transport",
      (value) => parseInt(value, 10),
      3000,
    )
    .option("--host <host>", "Host for HTTP transport")
    .option("--path <path>", "Endpoint path for HTTP transport")
    .option(
      "--endpoint-path <path>",
      "Endpoint path for HTTP transport (alias for --path)",
      "/mcp",
    );

  // Tool filtering options
  program
    .option(
      "--tools <mode>",
      "Tools loading mode: all, dynamic, or explicit",
      "all",
    )
    .option(
      "--tool <tool>",
      "Include specific tool ID or name (can be used multiple times)",
      (value, previous: string[]) => (previous || []).concat([value]),
      [] as string[],
    )
    .option(
      "--tag <tag>",
      "Include tools with specific OpenAPI tag (can be used multiple times)",
      (value, previous: string[]) => (previous || []).concat([value]),
      [] as string[],
    )
    .option(
      "--resource <resource>",
      "Include tools under specific resource path prefix (can be used multiple times)",
      (value, previous: string[]) => (previous || []).concat([value]),
      [] as string[],
    )
    .option(
      "--operation <method>",
      "Include tools for specific HTTP methods (can be used multiple times)",
      (value, previous: string[]) => (previous || []).concat([value]),
      [] as string[],
    );

  // Other options
  program
    .option(
      "--namespace <value>",
      "Namespace for the MCP server tools",
      (value: string, previous?: string) => value || previous,
    )
    .option("--disable-abbreviation", "Disable tool name abbreviation")
    .option("--debug", "Enable debug logging");

  program.parse();

  const options = program.opts();

  try {
    // Load environment config first to check for spec configuration
    const envConfig = loadFromEnvironment();

    // Validate spec input options
    const hasSpec = !!options.openapiSpec;
    const hasStdin = !!options.specFromStdin;
    const hasInline = !!options.specInline;
    const hasEnvSpec = !!envConfig.openApiSpec;
    const hasEnvStdin = envConfig.specInputMethod === "stdin";
    const hasEnvInline = envConfig.specInputMethod === "inline";

    const specSources = [
      hasSpec,
      hasStdin,
      hasInline,
      hasEnvSpec,
      hasEnvStdin,
      hasEnvInline,
    ];
    const specCount = specSources.filter(Boolean).length;

    if (specCount === 0) {
      console.error(
        "Error: Must specify one of --openapi-spec, --spec-from-stdin, --spec-inline, " +
          "or OPENAPI_SPEC_PATH/OPENAPI_SPEC_INLINE environment variables",
      );
      process.exit(1);
    }

    // Determine spec input method and source (CLI options take precedence over env)
    let specInputMethod: SpecInputMethod;
    let openApiSpec: string | undefined;

    if (hasStdin) {
      specInputMethod = "stdin";
    } else if (hasInline) {
      specInputMethod = "inline";
      openApiSpec = options.specInline;
    } else if (hasSpec) {
      // Determine if it's a URL or file path
      const spec = options.openapiSpec;
      if (spec.startsWith("http://") || spec.startsWith("https://")) {
        specInputMethod = "url";
      } else {
        specInputMethod = "file";
      }
      openApiSpec = spec;
    } else {
      // Use environment configuration
      specInputMethod = envConfig.specInputMethod || "url";
      openApiSpec = envConfig.openApiSpec;

      // Determine method if not explicitly set in env
      if (envConfig.openApiSpec && !envConfig.specInputMethod) {
        if (
          envConfig.openApiSpec.startsWith("http://") ||
          envConfig.openApiSpec.startsWith("https://")
        ) {
          specInputMethod = "url";
        } else {
          specInputMethod = "file";
        }
      }
    }

    // Build configuration (envConfig already loaded above)
    const config: IOpenAPIServerConfig = {
      ...envConfig,
      name: options.serverName || envConfig.name,
      version: options.serverVersion || envConfig.version,
      namespace: options.namespace || envConfig.namespace,
      apiBaseUrl: options.apiBaseUrl || envConfig.apiBaseUrl,
      openApiSpec,
      specInputMethod,
      headers: options.headers || envConfig.headers,
      transportType: options.transport || envConfig.transportType || "stdio",
      httpPort: options.port || envConfig.httpPort,
      httpHost: options.host || envConfig.httpHost || "127.0.0.1",
      endpointPath:
        options.path ||
        options.endpointPath ||
        envConfig.endpointPath ||
        "/mcp",
      toolsMode: options.tools || envConfig.toolsMode,
      includeTools:
        options.tool.length > 0 ? options.tool : envConfig.includeTools,
      includeTags: options.tag.length > 0 ? options.tag : envConfig.includeTags,
      includeResources:
        options.resource.length > 0
          ? options.resource
          : envConfig.includeResources,
      includeOperations:
        options.operation.length > 0
          ? options.operation
          : envConfig.includeOperations,
      disableAbbreviation:
        options.disableAbbreviation || envConfig.disableAbbreviation,
      debug: options.debug || envConfig.debug,
    };

    // Validate required configuration
    if (!config.apiBaseUrl) {
      console.error(
        "Error: API base URL is required. Provide it via --api-base-url or API_BASE_URL environment variable",
      );
      process.exit(1);
    }

    if (config.debug || envConfig.debug) {
      console.log(
        "[DEBUG] Final configuration:",
        JSON.stringify(
          {
            apiBaseUrl: config.apiBaseUrl,
            transportType: config.transportType,
            httpPort: config.httpPort,
            httpHost: config.httpHost,
            endpointPath: config.endpointPath,
            toolsMode: config.toolsMode,
          },
          null,
          2,
        ),
      );
    }

    // Create and start server
    const server = new OpenAPIServer(config);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    // Start the server
    await server.start();

    // Keep the process running for stdio transport
    if (config.transportType === "stdio") {
      // For stdio transport, the process will keep running
      // until the parent process closes the connection
      process.stdin.resume();
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  }
}

// Handle environment variables
function loadFromEnvironment(): Partial<IOpenAPIServerConfig> {
  const env = process.env;
  const config: Partial<IOpenAPIServerConfig> = {};

  if (env.API_BASE_URL) config.apiBaseUrl = env.API_BASE_URL;
  if (env.OPENAPI_SPEC_PATH) config.openApiSpec = env.OPENAPI_SPEC_PATH;
  if (env.OPENAPI_SPEC_INLINE) {
    config.openApiSpec = env.OPENAPI_SPEC_INLINE;
    config.specInputMethod = "inline";
  }
  if (env.OPENAPI_SPEC_FROM_STDIN === "true") {
    config.specInputMethod = "stdin";
  }
  if (env.API_HEADERS) {
    const headers: Record<string, string> = {};
    env.API_HEADERS.split(",").forEach((pair) => {
      const [key, ...valueParts] = pair.split(":");
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(":").trim();
      }
    });
    config.headers = headers;
  }
  if (env.SERVER_NAME) config.name = env.SERVER_NAME;
  if (env.SERVER_VERSION) config.version = env.SERVER_VERSION;
  if (env.NAMESPACE) config.namespace = env.NAMESPACE;
  if (env.TRANSPORT_TYPE) config.transportType = env.TRANSPORT_TYPE as any;
  if (env.HTTP_PORT) config.httpPort = parseInt(env.HTTP_PORT, 10);
  if (env.HTTP_HOST) config.httpHost = env.HTTP_HOST;
  if (env.ENDPOINT_PATH) config.endpointPath = env.ENDPOINT_PATH;
  if (env.TOOLS_MODE) config.toolsMode = env.TOOLS_MODE as any;
  if (env.DISABLE_ABBREVIATION === "true") config.disableAbbreviation = true;

  return config;
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
