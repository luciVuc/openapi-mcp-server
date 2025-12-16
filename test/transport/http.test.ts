/**
 * Test suite for HTTP Transport Handler
 *
 * Tests the HTTP transport implementation:
 * - HttpTransportHandler class functionality
 * - HTTP server lifecycle (start/stop)
 * - Request handling and routing
 * - CORS support and configuration
 * - Status reporting and monitoring
 * - Error handling scenarios
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as http from "http";
import { HttpTransportHandler } from "../../src/transport/http";
import { BaseTransportHandler } from "../../src/transport/base";

// Mock the http module
jest.mock("http", () => ({
  createServer: jest.fn(),
}));

describe("HTTP Transport Handler", () => {
  let mockServer: Server;
  let mockHttpServer: any;
  let createServerMock: jest.MockedFunction<typeof http.createServer>;

  beforeEach(() => {
    // Create a comprehensive mock server
    mockServer = {
      name: "test-server",
      version: "1.0.0",
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    // Create mock HTTP server with simple any type to avoid complex type issues
    mockHttpServer = {
      listen: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      listening: false,
      address: jest.fn(),
    };

    // Mock http.createServer
    createServerMock = http.createServer as jest.MockedFunction<
      typeof http.createServer
    >;
    createServerMock.mockReturnValue(mockHttpServer);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with server and default config", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      expect(handler).toBeInstanceOf(HttpTransportHandler);
      expect(handler).toBeInstanceOf(BaseTransportHandler);
    });

    it("should create instance with custom configuration", () => {
      const config = {
        httpPort: 8080,
        httpHost: "0.0.0.0",
        endpointPath: "/api/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      expect(handler).toBeInstanceOf(HttpTransportHandler);
    });

    it("should accept various port configurations", () => {
      const configs = [
        { httpPort: 80, httpHost: "localhost", endpointPath: "/" },
        { httpPort: 443, httpHost: "0.0.0.0", endpointPath: "/ssl" },
        {
          httpPort: 65535,
          httpHost: "192.168.1.100",
          endpointPath: "/max-port",
        },
      ];

      configs.forEach((config) => {
        expect(() => {
          new HttpTransportHandler(mockServer, config);
        }).not.toThrow();
      });
    });

    it("should initialize with null HTTP server", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Initially, HTTP server should be null and not active
      const status = handler.getStatus();
      expect(status.active).toBe(false);
      expect(status.listening).toBe(false);
    });
  });

  describe("getType method", () => {
    it("should return 'http' as transport type", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      expect(handler.getType()).toBe("http");
    });

    it("should consistently return same type", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      expect(handler.getType()).toBe("http");
      expect(handler.getType()).toBe("http");
      expect(handler.getType()).toBe("http");
    });
  });

  describe("start method", () => {
    it("should start HTTP server successfully", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Mock listen to call callback immediately
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      // Verify http.createServer was called
      expect(createServerMock).toHaveBeenCalledTimes(1);
      expect(createServerMock).toHaveBeenCalledWith(expect.any(Function));

      // Verify listen was called
      expect(mockHttpServer.listen).toHaveBeenCalledTimes(1);
    });

    it("should update status after starting", async () => {
      const config = {
        httpPort: 4000,
        httpHost: "localhost",
        endpointPath: "/test",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Before start
      expect(handler.getStatus().active).toBe(false);
      expect(handler.getStatus().listening).toBe(false);

      // Mock successful listen
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        mockHttpServer.listening = true;
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      // After start
      const status = handler.getStatus();
      expect(status.active).toBe(true);
      expect(status.listening).toBe(true);
      expect(status.address).toBe("localhost");
      expect(status.port).toBe(4000);
      expect(status.endpoint).toBe("/test");
    });

    it("should handle server listen errors", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);
      const listenError = new Error("Port already in use");

      // Mock listen error via on method
      mockHttpServer.on.mockImplementation((event: string, callback: any) => {
        if (event === "error") {
          setTimeout(() => callback(listenError), 0);
        }
        return mockHttpServer;
      });

      await expect(handler.start()).rejects.toThrow("Port already in use");
    });

    it("should handle multiple start calls gracefully", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Mock successful listen
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();
      await handler.start(); // Second call

      // Should create multiple HTTP servers
      expect(createServerMock).toHaveBeenCalledTimes(2);
    });

    it("should configure server with request handler", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Mock successful listen
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      // Verify createServer was called with a request handler function
      expect(createServerMock).toHaveBeenCalledWith(expect.any(Function));

      const requestHandler = createServerMock.mock.calls[0][0];
      expect(typeof requestHandler).toBe("function");
    });
  });

  describe("stop method", () => {
    it("should stop HTTP server successfully", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Start first
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        mockHttpServer.listening = true;
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();
      expect(handler.getStatus().active).toBe(true);

      // Mock close to call callback
      mockHttpServer.close.mockImplementation((callback: any) => {
        mockHttpServer.listening = false;
        if (callback) callback();
        return mockHttpServer;
      });

      // Then stop
      await handler.stop();

      // Verify close was called
      expect(mockHttpServer.close).toHaveBeenCalledTimes(1);

      // Verify status is updated
      expect(handler.getStatus().active).toBe(false);
      expect(handler.getStatus().listening).toBe(false);
    });

    it("should handle stop when not started", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Stop without starting
      await handler.stop();

      // Should not attempt to close since server is null
      expect(mockHttpServer.close).not.toHaveBeenCalled();

      // Status should remain inactive
      expect(handler.getStatus().active).toBe(false);
    });

    it("should handle multiple stop calls", async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Start
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      // Mock close
      mockHttpServer.close.mockImplementation((callback: any) => {
        if (callback) callback();
        return mockHttpServer;
      });

      await handler.stop();
      await handler.stop(); // Second stop call

      // Close should only be called once
      expect(mockHttpServer.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStatus method", () => {
    it("should return correct status when inactive", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      const status = handler.getStatus();

      expect(status).toEqual({
        type: "http",
        active: false,
        listening: false,
        address: undefined,
        port: undefined,
        endpoint: undefined,
      });
    });

    it("should return correct status when active", async () => {
      const config = {
        httpPort: 8080,
        httpHost: "0.0.0.0",
        endpointPath: "/api",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Mock listen
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        mockHttpServer.listening = true;
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      const status = handler.getStatus();

      expect(status).toEqual({
        type: "http",
        active: true,
        listening: true,
        address: "0.0.0.0",
        port: 8080,
        endpoint: "/api",
      });
    });

    it("should include all HTTP-specific status fields", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      const status = handler.getStatus();

      expect(status).toHaveProperty("type");
      expect(status).toHaveProperty("active");
      expect(status).toHaveProperty("listening");
      expect(status).toHaveProperty("address");
      expect(status).toHaveProperty("port");
      expect(status).toHaveProperty("endpoint");
    });
  });

  describe("request handling", () => {
    let requestHandler: any;

    beforeEach(async () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      // Mock listen
      mockHttpServer.listen.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
          callback();
        }
        return mockHttpServer;
      });

      await handler.start();

      // Get the request handler
      requestHandler = createServerMock.mock.calls[0][0];
    });

    it("should handle GET requests to endpoint", async () => {
      const mockReq = {
        method: "GET",
        url: "/mcp",
      } as http.IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 0,
        end: jest.fn(),
      } as any;

      await requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json",
      );
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining("OpenAPI MCP Server"),
      );
    });

    it("should handle OPTIONS requests (CORS preflight)", async () => {
      const mockReq = {
        method: "OPTIONS",
        url: "/mcp",
      } as http.IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 0,
        end: jest.fn(),
      } as any;

      await requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        "Content-Type",
      );
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.end).toHaveBeenCalledWith();
    });

    it("should return 404 for wrong endpoint", async () => {
      const mockReq = {
        method: "GET",
        url: "/wrong-endpoint",
      } as http.IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 0,
        end: jest.fn(),
      } as any;

      await requestHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(404);
      expect(mockRes.end).toHaveBeenCalledWith("Not Found");
    });

    it("should return 501 for unsupported methods", async () => {
      const mockReq = {
        method: "POST",
        url: "/mcp",
      } as http.IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 0,
        end: jest.fn(),
      } as any;

      await requestHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(501);
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining("not fully implemented"),
      );
    });

    it("should set CORS headers for all requests", async () => {
      const mockReq = {
        method: "GET",
        url: "/mcp",
      } as http.IncomingMessage;

      const mockRes = {
        setHeader: jest.fn(),
        statusCode: 0,
        end: jest.fn(),
      } as any;

      await requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        "Content-Type",
      );
    });
  });

  describe("base class compliance", () => {
    it("should implement BaseTransportHandler interface", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      expect(handler).toBeInstanceOf(BaseTransportHandler);

      // Check required methods exist
      expect(typeof handler.start).toBe("function");
      expect(typeof handler.stop).toBe("function");
      expect(typeof handler.getType).toBe("function");
      expect(typeof handler.getStatus).toBe("function");
    });

    it("should have async start and stop methods", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      const startResult = handler.start();
      const stopResult = handler.stop();

      expect(startResult).toBeInstanceOf(Promise);
      expect(stopResult).toBeInstanceOf(Promise);
    });

    it("should override getStatus with HTTP-specific implementation", () => {
      const config = {
        httpPort: 3000,
        httpHost: "127.0.0.1",
        endpointPath: "/mcp",
      };

      const handler = new HttpTransportHandler(mockServer, config);

      const status = handler.getStatus();

      // Should have base properties plus HTTP-specific ones
      expect(status).toHaveProperty("type");
      expect(status).toHaveProperty("active");
      expect(status).toHaveProperty("listening");
      expect(status).toHaveProperty("address");
      expect(status).toHaveProperty("port");
      expect(status).toHaveProperty("endpoint");

      expect(status.type).toBe("http");
    });
  });
});
