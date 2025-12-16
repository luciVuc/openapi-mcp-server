/**
 * Simple example of using the OpenAPI MCP Server
 */

import { OpenAPIServer } from "../src/index";

async function example() {
  // Example OpenAPI spec (minimal)
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Example API",
      version: "1.0.0",
    },
    paths: {
      "/users": {
        get: {
          summary: "Get all users",
          operationId: "getUsers",
          responses: {
            "200": {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create a user",
          operationId: "createUser",
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
              description: "User created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      name: { type: "string" },
                      email: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const server = new OpenAPIServer({
    name: "example-api-server",
    version: "1.0.0",
    apiBaseUrl: "https://jsonplaceholder.typicode.com",
    openApiSpec: JSON.stringify(openApiSpec),
    specInputMethod: "inline",
    transportType: "http",
    httpPort: 3001,
    toolsMode: "all",
    debug: true,
  });

  try {
    console.log("Starting example server...");
    console.log("Server stats (before loading):", server.getStats());

    await server.start();

    console.log("✅ Server started successfully!");
    console.log("Server stats (after loading):", server.getStats());

    console.log("\nExample server configuration:");
    console.log("- API Base URL:", "https://jsonplaceholder.typicode.com");
    console.log("- Transport: HTTP on http://localhost:3001");
    console.log("- OpenAPI Spec: Inline JSON");

    console.log("\nTo test the HTTP endpoint:");
    console.log("curl http://localhost:3001/mcp");
  } catch (error) {
    console.error("Error:", error);
  }
  return server;
}

if (require.main === module) {
  example();
}
