/**
 * Example: CLI usage patterns and configurations
 */

import { spawn } from "child_process";
import * as path from "path";

/**
 * Demonstration of various CLI usage patterns
 */
async function cliExamples() {
  console.log("=== OpenAPI MCP Server CLI Examples ===\\n");

  const cliPath = path.join(__dirname, "../src/cli.ts");

  const examples = [
    {
      title: "1. Basic usage with URL spec",
      description: "Load OpenAPI spec from URL with stdio transport",
      command: "npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://petstore.swagger.io/v2",
        "--openapi-spec",
        "https://petstore.swagger.io/v2/swagger.json",
        "--transport",
        "stdio",
      ],
    },
    {
      title: "2. HTTP transport with local file",
      description: "Load spec from local file and run HTTP server",
      command: "npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://api.example.com",
        "--openapi-spec",
        "./my-api-spec.yaml",
        "--transport",
        "http",
        "--port",
        "3000",
        "--host",
        "0.0.0.0",
      ],
    },
    {
      title: "3. Filtered tools with authentication",
      description: "Only load specific tools with API headers",
      command: "npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://api.example.com",
        "--openapi-spec",
        "https://api.example.com/openapi.json",
        "--headers",
        "Authorization:Bearer token123,X-API-Key:key456",
        "--tools",
        "explicit",
        "--tool",
        "GET::users",
        "--tool",
        "POST::users",
        "--debug",
      ],
    },
    {
      title: "4. Tag-based filtering",
      description: "Load only tools with specific tags",
      command: "npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://petstore.swagger.io/v2",
        "--openapi-spec",
        "https://petstore.swagger.io/v2/swagger.json",
        "--tag",
        "pet",
        "--tag",
        "store",
        "--operation",
        "GET",
        "--operation",
        "POST",
      ],
    },
    {
      title: "5. Stdin spec input",
      description: "Read OpenAPI spec from standard input",
      command: "cat openapi.json | npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://api.example.com",
        "--spec-from-stdin",
        "--debug",
      ],
    },
    {
      title: "6. Dynamic tools mode",
      description: "Load only meta-tools for dynamic API exploration",
      command: "npx ts-node src/cli.ts",
      args: [
        "--api-base-url",
        "https://api.github.com",
        "--openapi-spec",
        "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
        "--tools",
        "dynamic",
        "--transport",
        "http",
        "--port",
        "3001",
      ],
    },
  ];

  examples.forEach((example, index) => {
    console.log(`\\x1b[36m${example.title}\\x1b[0m`);
    console.log(`\\x1b[90m${example.description}\\x1b[0m`);
    console.log(`\\x1b[33m${example.command} \\\\\\x1b[0m`);

    example.args.forEach((arg, argIndex) => {
      const isLast = argIndex === example.args.length - 1;
      const continuation = isLast ? "" : " \\\\";
      console.log(`\\x1b[33m  ${arg}${continuation}\\x1b[0m`);
    });

    console.log(); // Empty line
  });

  console.log("\\x1b[36m=== Environment Variables ===\\x1b[0m");
  console.log(
    "You can also use environment variables instead of CLI arguments:\\n",
  );

  const envVars = {
    API_BASE_URL: "Base URL for the API endpoints",
    OPENAPI_SPEC_PATH: "Path or URL to OpenAPI specification",
    OPENAPI_SPEC_INLINE: "OpenAPI spec content directly as string",
    OPENAPI_SPEC_FROM_STDIN: 'Set to "true" to read spec from stdin',
    API_HEADERS: "Comma-separated key:value pairs for headers",
    SERVER_NAME: "Name for the MCP server",
    SERVER_VERSION: "Version of the server",
    TRANSPORT_TYPE: "Transport type (stdio or http)",
    HTTP_PORT: "Port for HTTP transport",
    HTTP_HOST: "Host for HTTP transport",
    ENDPOINT_PATH: "Endpoint path for HTTP transport",
    TOOLS_MODE: "Tools loading mode (all, dynamic, explicit)",
    DISABLE_ABBREVIATION: 'Set to "true" to disable name abbreviation',
  };

  Object.entries(envVars).forEach(([envVar, description]) => {
    console.log(`\\x1b[32m${envVar}\\x1b[0m`);
    console.log(`  ${description}\\n`);
  });

  console.log("\\x1b[36m=== Example with Environment Variables ===\\x1b[0m");
  console.log('\\x1b[33mexport API_BASE_URL="https://api.example.com"\\x1b[0m');
  console.log('\\x1b[33mexport OPENAPI_SPEC_PATH="./api-spec.yaml"\\x1b[0m');
  console.log(
    '\\x1b[33mexport API_HEADERS="Authorization:Bearer token,X-API-Key:key"\\x1b[0m',
  );
  console.log('\\x1b[33mexport TRANSPORT_TYPE="http"\\x1b[0m');
  console.log('\\x1b[33mexport HTTP_PORT="3000"\\x1b[0m');
  console.log("\\x1b[33mnpx ts-node src/cli.ts\\x1b[0m\\n");

  console.log("\\x1b[36m=== Docker Usage ===\\x1b[0m");
  console.log("For containerized deployments:\\n");

  console.log("\\x1b[33m# Mount local spec file\\x1b[0m");
  console.log(
    "\\x1b[33mdocker run -v /path/to/spec:/app/spec.json your-mcp-server \\\\\\x1b[0m",
  );
  console.log("\\x1b[33m  --api-base-url https://api.example.com \\\\\\x1b[0m");
  console.log("\\x1b[33m  --openapi-spec /app/spec.json\\x1b[0m\\n");

  console.log("\\x1b[33m# Use stdin with docker\\x1b[0m");
  console.log(
    "\\x1b[33mcat openapi.json | docker run -i your-mcp-server \\\\\\x1b[0m",
  );
  console.log("\\x1b[33m  --api-base-url https://api.example.com \\\\\\x1b[0m");
  console.log("\\x1b[33m  --spec-from-stdin\\x1b[0m\\n");

  console.log("\\x1b[36m=== Claude Desktop Integration ===\\x1b[0m");
  console.log("Add to your Claude Desktop config file:\\n");

  const claudeConfigs = [
    {
      name: "Simple stdio setup",
      config: {
        mcpServers: {
          "my-api": {
            command: "npx",
            args: [
              "@lucid-spark/openapi-mcp-server",
              "--api-base-url",
              "https://api.example.com",
              "--openapi-spec",
              "https://api.example.com/openapi.json",
              "--headers",
              "Authorization:Bearer ${API_TOKEN}",
            ],
            env: {
              API_TOKEN: "your-actual-token-here",
            },
          },
        },
      },
    },
    {
      name: "Local development setup",
      config: {
        mcpServers: {
          "local-api": {
            command: "npx",
            args: [
              "ts-node",
              "/path/to/openapi-mcp-server/src/cli.ts",
              "--api-base-url",
              "http://localhost:8080",
              "--openapi-spec",
              "/path/to/local-spec.yaml",
              "--debug",
            ],
          },
        },
      },
    },
  ];

  claudeConfigs.forEach(({ name, config }) => {
    console.log(`\\x1b[32m${name}:\\x1b[0m`);
    console.log("\\x1b[90m" + JSON.stringify(config, null, 2) + "\\x1b[0m\\n");
  });

  console.log("\\x1b[36m=== Troubleshooting ===\\x1b[0m");
  console.log("Common issues and solutions:\\n");

  const troubleshooting = [
    {
      issue: "Spec loading fails",
      solution: "Check URL accessibility, file permissions, or stdin data",
    },
    {
      issue: "No tools loaded",
      solution: "Verify OpenAPI spec has valid paths and operations",
    },
    {
      issue: "Authentication errors",
      solution: "Check API headers format and token validity",
    },
    {
      issue: "Tool name too long errors",
      solution: "Use --disable-abbreviation false or check operationId length",
    },
    {
      issue: "HTTP transport issues",
      solution: "Check port availability and firewall settings",
    },
  ];

  troubleshooting.forEach(({ issue, solution }) => {
    console.log(`\\x1b[31m${issue}:\\x1b[0m`);
    console.log(`  ${solution}\\n`);
  });
}

if (require.main === module) {
  cliExamples().catch(console.error);
}
