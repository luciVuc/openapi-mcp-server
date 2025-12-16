/**
 * Test suite for Base Transport Handler
 *
 * Tests the abstract base class and factory function:
 * - BaseTransportHandler abstract class functionality
 * - createTransportHandler factory function
 * - Transport handler creation for different types
 * - Error handling for unsupported transport types
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  BaseTransportHandler,
  createTransportHandler,
} from "../../src/transport/base";
import { ITransportConfig, ITransportHandler } from "../../src/types";

// Create a concrete implementation for testing the abstract base class
class TestTransportHandler extends BaseTransportHandler {
  private isStarted = false;
  private isStopped = false;

  async start(): Promise<void> {
    this.isStarted = true;
  }

  async stop(): Promise<void> {
    this.isStopped = true;
  }

  getType(): string {
    return "test";
  }

  // Expose protected server for testing
  getServer(): Server {
    return this.server;
  }

  // Expose internal state for testing
  getInternalState() {
    return {
      isStarted: this.isStarted,
      isStopped: this.isStopped,
    };
  }

  // Override getStatus with more detailed information
  getStatus(): {
    type: string;
    active: boolean;
    started: boolean;
    stopped: boolean;
  } {
    return {
      type: this.getType(),
      active: this.isStarted && !this.isStopped,
      started: this.isStarted,
      stopped: this.isStopped,
    };
  }
}

describe("Base Transport Handler", () => {
  let mockServer: Server;

  beforeEach(() => {
    // Create a minimal mock server
    mockServer = {
      name: "test-server",
      version: "1.0.0",
    } as any;
  });

  describe("BaseTransportHandler (abstract class)", () => {
    describe("constructor", () => {
      it("should initialize with server instance", () => {
        const handler = new TestTransportHandler(mockServer);

        expect(handler).toBeInstanceOf(BaseTransportHandler);
        expect(handler.getServer()).toBe(mockServer);
      });

      it("should accept any server instance", () => {
        const server1 = { name: "server1" } as any;
        const server2 = { name: "server2" } as any;

        const handler1 = new TestTransportHandler(server1);
        const handler2 = new TestTransportHandler(server2);

        expect(handler1.getServer()).toBe(server1);
        expect(handler2.getServer()).toBe(server2);
      });
    });

    describe("abstract method implementation", () => {
      it("should implement start method", async () => {
        const handler = new TestTransportHandler(mockServer);

        await handler.start();

        expect(handler.getInternalState().isStarted).toBe(true);
      });

      it("should implement stop method", async () => {
        const handler = new TestTransportHandler(mockServer);

        await handler.stop();

        expect(handler.getInternalState().isStopped).toBe(true);
      });

      it("should implement getType method", () => {
        const handler = new TestTransportHandler(mockServer);

        expect(handler.getType()).toBe("test");
      });
    });

    describe("getStatus method", () => {
      it("should return basic status by default", () => {
        const handler = new TestTransportHandler(mockServer);

        const status = handler.getStatus();

        expect(status).toEqual({
          type: "test",
          active: false,
          started: false,
          stopped: false,
        });
      });

      it("should reflect transport state changes", async () => {
        const handler = new TestTransportHandler(mockServer);

        // Initial state
        expect(handler.getStatus().active).toBe(false);

        // After start
        await handler.start();
        expect(handler.getStatus().active).toBe(true);
        expect(handler.getStatus().started).toBe(true);

        // After stop
        await handler.stop();
        expect(handler.getStatus().active).toBe(false);
        expect(handler.getStatus().stopped).toBe(true);
      });
    });

    describe("interface compliance", () => {
      it("should implement ITransportHandler interface", () => {
        const handler = new TestTransportHandler(mockServer);

        // Check required methods exist
        expect(typeof handler.start).toBe("function");
        expect(typeof handler.stop).toBe("function");

        // Runtime type check
        expect(handler).toBeInstanceOf(BaseTransportHandler);
      });

      it("should have async start and stop methods", () => {
        const handler = new TestTransportHandler(mockServer);

        const startResult = handler.start();
        const stopResult = handler.stop();

        expect(startResult).toBeInstanceOf(Promise);
        expect(stopResult).toBeInstanceOf(Promise);
      });
    });
  });

  describe("createTransportHandler factory", () => {
    describe("stdio transport creation", () => {
      it("should create StdioTransportHandler for stdio type", async () => {
        const config: ITransportConfig = { type: "stdio" };

        const handler = await createTransportHandler(mockServer, config);

        expect(handler).toBeDefined();
        expect((handler as BaseTransportHandler).getType()).toBe("stdio");
        expect(handler).toBeInstanceOf(BaseTransportHandler);
      });

      it("should handle stdio config without additional options", async () => {
        const config: ITransportConfig = { type: "stdio" };

        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should ignore HTTP-specific options for stdio", async () => {
        const config: ITransportConfig = {
          type: "stdio",
          httpPort: 3000,
          httpHost: "localhost",
          endpointPath: "/test",
        };

        const handler = await createTransportHandler(mockServer, config);

        expect((handler as BaseTransportHandler).getType()).toBe("stdio");
      });
    });

    describe("http transport creation", () => {
      it("should create HttpTransportHandler for http type", async () => {
        const config: ITransportConfig = { type: "http" };

        const handler = await createTransportHandler(mockServer, config);

        expect(handler).toBeDefined();
        expect((handler as BaseTransportHandler).getType()).toBe("http");
        expect(handler).toBeInstanceOf(BaseTransportHandler);
      });

      it("should use default HTTP configuration when not specified", async () => {
        const config: ITransportConfig = { type: "http" };

        const handler = await createTransportHandler(mockServer, config);
        const status = (handler as BaseTransportHandler).getStatus() as any;

        expect((handler as BaseTransportHandler).getType()).toBe("http");
        expect(status.type).toBe("http");
      });

      it("should use provided HTTP configuration", async () => {
        const config: ITransportConfig = {
          type: "http",
          httpPort: 4000,
          httpHost: "0.0.0.0",
          endpointPath: "/custom-endpoint",
        };

        const handler = await createTransportHandler(mockServer, config);

        expect((handler as BaseTransportHandler).getType()).toBe("http");
      });

      it("should handle partial HTTP configuration", async () => {
        const config: ITransportConfig = {
          type: "http",
          httpPort: 8080,
        };

        const handler = await createTransportHandler(mockServer, config);

        expect((handler as BaseTransportHandler).getType()).toBe("http");
      });
    });

    describe("error handling", () => {
      it("should throw error for unsupported transport type", async () => {
        const config = { type: "unsupported" } as any;

        await expect(
          createTransportHandler(mockServer, config),
        ).rejects.toThrow("Unsupported transport type: unsupported");
      });

      it("should throw error for null transport type", async () => {
        const config = { type: null } as any;

        await expect(
          createTransportHandler(mockServer, config),
        ).rejects.toThrow("Unsupported transport type: null");
      });

      it("should throw error for undefined transport type", async () => {
        const config = { type: undefined } as any;

        await expect(
          createTransportHandler(mockServer, config),
        ).rejects.toThrow("Unsupported transport type: undefined");
      });

      it("should throw error for empty config", async () => {
        const config = {} as any;

        await expect(
          createTransportHandler(mockServer, config),
        ).rejects.toThrow("Unsupported transport type: undefined");
      });

      it("should provide meaningful error messages", async () => {
        const invalidTypes = ["websocket", "tcp", "grpc", "invalid"];

        for (const type of invalidTypes) {
          const config = { type } as any;

          await expect(
            createTransportHandler(mockServer, config),
          ).rejects.toThrow(`Unsupported transport type: ${type}`);
        }
      });
    });

    describe("type safety and validation", () => {
      it("should accept valid ITransportConfig", async () => {
        const validConfigs: ITransportConfig[] = [
          { type: "stdio" },
          { type: "http" },
          { type: "http", httpPort: 3000 },
          { type: "http", httpHost: "localhost" },
          { type: "http", endpointPath: "/mcp" },
          {
            type: "http",
            httpPort: 8080,
            httpHost: "0.0.0.0",
            endpointPath: "/api/mcp",
          },
        ];

        for (const config of validConfigs) {
          await expect(
            createTransportHandler(mockServer, config),
          ).resolves.toBeDefined();
        }
      });

      it("should work with different server instances", () => {
        const servers = [
          { name: "server1", version: "1.0.0" } as any,
          { name: "server2", version: "2.0.0" } as any,
          {} as any,
        ];

        servers.forEach((server) => {
          const config: ITransportConfig = { type: "stdio" };

          expect(() => {
            createTransportHandler(server, config);
          }).not.toThrow();
        });
      });
    });

    describe("dynamic imports and dependencies", () => {
      it("should handle stdio transport import", async () => {
        const config: ITransportConfig = { type: "stdio" };

        // Should not throw due to import issues
        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should handle http transport import", async () => {
        const config: ITransportConfig = { type: "http" };

        // Should not throw due to import issues
        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should create different instances for multiple calls", async () => {
        const config: ITransportConfig = { type: "stdio" };

        const handler1 = await createTransportHandler(mockServer, config);
        const handler2 = await createTransportHandler(mockServer, config);

        expect(handler1).not.toBe(handler2);
        expect((handler1 as BaseTransportHandler).getType()).toBe(
          (handler2 as BaseTransportHandler).getType(),
        );
      });
    });

    describe("configuration edge cases", () => {
      it("should handle zero port configuration", async () => {
        const config: ITransportConfig = {
          type: "http",
          httpPort: 0,
        };

        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should handle empty string configurations", async () => {
        const config: ITransportConfig = {
          type: "http",
          httpHost: "",
          endpointPath: "",
        };

        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should handle very large port numbers", async () => {
        const config: ITransportConfig = {
          type: "http",
          httpPort: 65535,
        };

        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });

      it("should handle complex endpoint paths", async () => {
        const config: ITransportConfig = {
          type: "http",
          endpointPath: "/very/complex/path/to/endpoint",
        };

        await expect(
          createTransportHandler(mockServer, config),
        ).resolves.toBeDefined();
      });
    });
  });

  describe("integration scenarios", () => {
    it("should support creating multiple different transport types", async () => {
      const stdioConfig: ITransportConfig = { type: "stdio" };
      const httpConfig: ITransportConfig = { type: "http" };

      const stdioHandler = await createTransportHandler(
        mockServer,
        stdioConfig,
      );
      const httpHandler = await createTransportHandler(mockServer, httpConfig);

      expect((stdioHandler as BaseTransportHandler).getType()).toBe("stdio");
      expect((httpHandler as BaseTransportHandler).getType()).toBe("http");
      expect(stdioHandler).not.toBe(httpHandler);
    });

    it("should support complex configuration scenarios", async () => {
      const complexConfig: ITransportConfig = {
        type: "http",
        httpPort: 9000,
        httpHost: "192.168.1.100",
        endpointPath: "/api/v1/mcp/openapi",
      };

      const handler = await createTransportHandler(mockServer, complexConfig);

      expect((handler as BaseTransportHandler).getType()).toBe("http");
      expect(handler).toBeInstanceOf(BaseTransportHandler);
    });

    it("should work with transport lifecycle", async () => {
      const config: ITransportConfig = { type: "stdio" };

      // Create a more complete mock server for lifecycle testing
      const mockServerWithMethods = {
        name: "test-server",
        version: "1.0.0",
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      } as any;

      const handler = await createTransportHandler(
        mockServerWithMethods,
        config,
      );

      // Should support full lifecycle
      await expect(handler.start()).resolves.not.toThrow();
      await expect(handler.stop()).resolves.not.toThrow();

      // Verify server methods were called
      expect(mockServerWithMethods.connect).toHaveBeenCalled();
      expect(mockServerWithMethods.close).toHaveBeenCalled();
    });
  });
});
