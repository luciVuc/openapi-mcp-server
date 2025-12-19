/**
 * Example: Dynamic authentication with token refresh
 */

import { IAuthProvider, OpenAPIServer } from "../src/index";
import { AxiosError } from "axios";

/**
 * Example AuthProvider that simulates token-based authentication
 * with expiration and refresh capabilities
 */
class ExampleAuthProvider implements IAuthProvider {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshToken: string | null = null;

  constructor(initialToken?: string, refreshToken?: string) {
    if (initialToken) {
      this.setToken(initialToken, 3600); // 1 hour expiry
    }
    this.refreshToken = refreshToken || "example-refresh-token";
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    // Check if token is expired or missing
    if (!this.accessToken || this.isTokenExpired()) {
      // Try to refresh the token
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error(
          "Access token expired and no refresh token available. Please re-authenticate.",
        );
      }
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
      "X-Client-Version": "1.0.0",
      "User-Agent": "OpenAPI-MCP-Server/1.0.0",
    };
  }

  async handleAuthError(error: AxiosError): Promise<boolean> {
    console.log(
      `🔒 Authentication error: ${error.response?.status} ${error.response?.statusText}`,
    );

    // Check if this is an authentication error
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("🔄 Attempting to refresh token...");

      try {
        await this.refreshAccessToken();
        console.log("✅ Token refreshed successfully");
        return true; // Retry the request
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        throw new Error(
          "Authentication failed. Please provide a new access token.",
        );
      }
    }

    // Not an auth error, don't retry
    return false;
  }

  /**
   * Set a new access token
   */
  setToken(token: string, expiresInSeconds: number = 3600): void {
    this.accessToken = token;
    this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);
    console.log(`🔑 Token set, expires at: ${this.tokenExpiry.toISOString()}`);
  }

  /**
   * Check if the current token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;

    // Add 60 second buffer to avoid race conditions
    const bufferTime = 60 * 1000;
    return this.tokenExpiry.getTime() <= Date.now() + bufferTime;
  }

  /**
   * Simulate token refresh (in real implementation, this would call your auth server)
   */
  private async refreshAccessToken(): Promise<void> {
    console.log("🔄 Simulating token refresh...");

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate refresh success/failure
    if (Math.random() > 0.2) {
      // 80% success rate
      const newToken = `refreshed_token_${Date.now()}`;
      this.setToken(newToken, 3600);
    } else {
      throw new Error("Token refresh failed");
    }
  }
}

async function authExample() {
  console.log("=== Dynamic Authentication Example ===");

  // Create auth provider with initial token
  const authProvider = new ExampleAuthProvider("initial_token_123");

  // Create server with dynamic authentication
  const server = new OpenAPIServer({
    name: "auth-example-api",
    version: "1.0.0",
    apiBaseUrl: "https://httpbin.org", // Using httpbin for testing
    openApiSpec: JSON.stringify({
      openapi: "3.0.0",
      info: {
        title: "Auth Example API",
        version: "1.0.0",
        description: "Example API for testing authentication",
      },
      paths: {
        "/bearer": {
          get: {
            summary: "Test bearer token authentication",
            operationId: "testAuth",
            security: [{ bearerAuth: [] }],
            responses: {
              "200": {
                description: "Authentication successful",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        authenticated: { type: "boolean" },
                        token: { type: "string" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Authentication failed",
              },
            },
          },
        },
        "/headers": {
          get: {
            summary: "Echo request headers",
            operationId: "echoHeaders",
            responses: {
              "200": {
                description: "Request headers",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        headers: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    }),
    specInputMethod: "inline",
    authProvider: authProvider, // Use dynamic auth provider
    transportType: "stdio",
    toolsMode: "all",
    debug: true,
  });

  console.log("\\nConfiguration:");
  console.log("- API Base URL:", "https://httpbin.org");
  console.log("- Authentication: Dynamic AuthProvider with token refresh");
  console.log("- Transport:", "stdio");

  try {
    console.log("\\nStarting server...");
    await server.start();

    const stats = server.getStats();
    console.log("\\nServer stats:");
    console.log(`- Total tools: ${stats.tools.total}`);
    console.log(`- Endpoint tools: ${stats.tools.endpointTools}`);
    console.log(`- Meta tools: ${stats.tools.metaTools}`);

    console.log("\\n✅ Server started successfully!");
    console.log("\\nAuthentication features:");
    console.log("- ✅ Dynamic token refresh");
    console.log("- ✅ Automatic retry on auth errors");
    console.log("- ✅ Token expiration handling");
    console.log("- ✅ Custom headers per request");

    // Demonstrate token refresh by expiring the current token
    console.log("\\n🧪 Testing token expiration...");
    authProvider.setToken("expired_token", -1); // Set expired token

    console.log(
      "\\nTo use this server with Claude Desktop, add this to your config:",
    );
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            "auth-example-api": {
              command: "npx",
              args: ["ts-node", "examples/dynamic-auth.ts"],
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
  authExample().catch(console.error);
}
