/**
 * Example: Basic JSON Placeholder API with static authentication
 */

import { OpenAPIServer } from "../src/index";

async function basicExample() {
  // Create server with inline OpenAPI spec
  const server = new OpenAPIServer({
    name: "jsonplaceholder-api",
    version: "1.0.0",
    apiBaseUrl: "https://jsonplaceholder.typicode.com",
    openApiSpec: JSON.stringify({
      openapi: "3.0.0",
      info: {
        title: "JSONPlaceholder API",
        version: "1.0.0",
        description: "Simple fake REST API for testing and prototyping",
      },
      paths: {
        "/posts": {
          get: {
            summary: "Get all posts",
            operationId: "getAllPosts",
            tags: ["posts"],
            responses: {
              "200": {
                description: "List of posts",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "number" },
                          title: { type: "string" },
                          body: { type: "string" },
                          userId: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: "Create a new post",
            operationId: "createPost",
            tags: ["posts"],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      body: { type: "string" },
                      userId: { type: "number" },
                    },
                    required: ["title", "body", "userId"],
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Post created",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        body: { type: "string" },
                        userId: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/posts/{id}": {
          get: {
            summary: "Get a specific post",
            operationId: "getPost",
            tags: ["posts"],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "number" },
                description: "Post ID",
              },
            ],
            responses: {
              "200": {
                description: "Post details",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        body: { type: "string" },
                        userId: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/users": {
          get: {
            summary: "Get all users",
            operationId: "getAllUsers",
            tags: ["users"],
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
                          username: { type: "string" },
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
      },
      tags: [
        { name: "posts", description: "Posts operations" },
        { name: "users", description: "Users operations" },
      ],
    }),
    specInputMethod: "inline",
    transportType: "stdio",
    toolsMode: "all",
    debug: true,
  });

  console.log("=== Basic JSONPlaceholder API Example ===");
  console.log("Server configuration:");
  console.log("- API Base URL:", "https://jsonplaceholder.typicode.com");
  console.log("- Transport:", "stdio");
  console.log("- Tools Mode:", "all");

  // Get stats before starting
  const stats = server.getStats();
  console.log("\\nServer stats (before loading):");
  console.log(JSON.stringify(stats, null, 2));

  try {
    console.log("\\nStarting server...");
    await server.start();

    // Get stats after starting
    const loadedStats = server.getStats();
    console.log("\\nServer stats (after loading):");
    console.log(JSON.stringify(loadedStats, null, 2));

    console.log("\\n✅ Server started successfully!");
    console.log(
      "\\nTo use this server with Claude Desktop, add this to your config:",
    );
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            "jsonplaceholder-api": {
              command: "npx",
              args: ["ts-node", "examples/basic-jsonplaceholder.ts"],
            },
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("❌ Error starting server:", error);
  }
}

if (require.main === module) {
  basicExample().catch(console.error);
}
