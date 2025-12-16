/**
 * Jest setup file for OpenAPI MCP Server tests
 */

// Global test utilities
export const createMockOpenAPISpec = () => ({
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://api.test.com",
    },
  ],
  paths: {
    "/users": {
      get: {
        operationId: "getUsers",
        summary: "Get all users",
        tags: ["users"],
        responses: {
          200: {
            description: "Success",
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
      post: {
        operationId: "createUser",
        summary: "Create a user",
        tags: ["users"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
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
    "/users/{id}": {
      get: {
        operationId: "getUserById",
        summary: "Get user by ID",
        tags: ["users"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
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
});

export const createMockConfig = () => ({
  apiBaseUrl: "https://api.test.com",
  openApiSpec: "test-spec.json",
  specInputMethod: "file" as const,
  name: "test-server",
  version: "1.0.0",
  transportType: "stdio" as const,
  toolsMode: "all" as const,
  headers: {},
  debug: false,
});
