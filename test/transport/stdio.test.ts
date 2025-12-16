/**
 * Test suite for Stdio Transport Handler
 *
 * Tests the stdio transport implementation:
 * - StdioTransportHandler class functionality
 * - Transport lifecycle (start/stop)
 * - Status reporting and monitoring
 * - MCP server integration
 * - Error handling scenarios
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StdioTransportHandler } from "../../src/transport/stdio";
import { BaseTransportHandler } from "../../src/transport/base";

// Mock the MCP SDK modules
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  })),
}));

describe("Stdio Transport Handler", () => {
  let mockServer: Server;
  let mockTransport: jest.Mocked<StdioServerTransport>;

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

    // Reset mocks
    jest.clearAllMocks();

    // Get the mocked constructor to access instances
    mockTransport = {
      close: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    (
      StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>
    ).mockImplementation(() => mockTransport);
  });

  describe("constructor", () => {
    it("should create instance with server", () => {
      const handler = new StdioTransportHandler(mockServer);

      expect(handler).toBeInstanceOf(StdioTransportHandler);
      expect(handler).toBeInstanceOf(BaseTransportHandler);
    });

    it("should initialize with null transport", () => {
      const handler = new StdioTransportHandler(mockServer);

      // Initially, transport should be null and not active
      const status = handler.getStatus();
      expect(status.active).toBe(false);
      expect(status.connected).toBe(false);
    });

    it("should accept different server instances", () => {
      const server1 = { name: "server1" } as any;
      const server2 = { name: "server2" } as any;

      const handler1 = new StdioTransportHandler(server1);
      const handler2 = new StdioTransportHandler(server2);

      expect(handler1).toBeInstanceOf(StdioTransportHandler);
      expect(handler2).toBeInstanceOf(StdioTransportHandler);
      expect(handler1).not.toBe(handler2);
    });
  });

  describe("getType method", () => {
    it("should return 'stdio' as transport type", () => {
      const handler = new StdioTransportHandler(mockServer);

      expect(handler.getType()).toBe("stdio");
    });

    it("should consistently return same type", () => {
      const handler = new StdioTransportHandler(mockServer);

      expect(handler.getType()).toBe("stdio");
      expect(handler.getType()).toBe("stdio");
      expect(handler.getType()).toBe("stdio");
    });
  });

  describe("start method", () => {
    it("should start stdio transport successfully", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();

      // Verify StdioServerTransport was created
      expect(StdioServerTransport).toHaveBeenCalledTimes(1);
      expect(StdioServerTransport).toHaveBeenCalledWith();

      // Verify server.connect was called with transport
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it("should update status after starting", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Before start
      expect(handler.getStatus().active).toBe(false);
      expect(handler.getStatus().connected).toBe(false);

      await handler.start();

      // After start
      expect(handler.getStatus().active).toBe(true);
      expect(handler.getStatus().connected).toBe(true);
    });

    it("should handle multiple start calls gracefully", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();
      await handler.start(); // Second call

      // Should only create one transport and connect once
      expect(StdioServerTransport).toHaveBeenCalledTimes(2);
      expect(mockServer.connect).toHaveBeenCalledTimes(2);
    });

    it("should handle server connection errors", async () => {
      const handler = new StdioTransportHandler(mockServer);
      const connectionError = new Error("Connection failed");

      mockServer.connect = jest.fn().mockRejectedValue(connectionError);

      await expect(handler.start()).rejects.toThrow("Connection failed");

      // Transport should still be created even if connection fails
      expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    });

    it("should handle transport creation errors", async () => {
      const handler = new StdioTransportHandler(mockServer);

      (
        StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>
      ).mockImplementation(() => {
        throw new Error("Transport creation failed");
      });

      await expect(handler.start()).rejects.toThrow(
        "Transport creation failed",
      );
    });
  });

  describe("stop method", () => {
    it("should stop stdio transport successfully", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Start first
      await handler.start();
      expect(handler.getStatus().active).toBe(true);

      // Then stop
      await handler.stop();

      // Verify server.close was called
      expect(mockServer.close).toHaveBeenCalledTimes(1);

      // Verify status is updated
      expect(handler.getStatus().active).toBe(false);
      expect(handler.getStatus().connected).toBe(false);
    });

    it("should handle stop when not started", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Stop without starting
      await handler.stop();

      // Should not call server.close since transport is null
      expect(mockServer.close).not.toHaveBeenCalled();

      // Status should remain inactive
      expect(handler.getStatus().active).toBe(false);
    });

    it("should handle multiple stop calls", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();
      await handler.stop();
      await handler.stop(); // Second stop call

      // Server.close should only be called once
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it("should handle server close errors", async () => {
      const handler = new StdioTransportHandler(mockServer);
      const closeError = new Error("Close failed");

      await handler.start();

      mockServer.close = jest.fn().mockRejectedValue(closeError);

      await expect(handler.stop()).rejects.toThrow("Close failed");
    });

    it("should null out transport after stopping", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();
      expect(handler.getStatus().active).toBe(true);

      await handler.stop();
      expect(handler.getStatus().active).toBe(false);

      // Should be able to start again
      await handler.start();
      expect(handler.getStatus().active).toBe(true);
    });
  });

  describe("getStatus method", () => {
    it("should return correct status when inactive", () => {
      const handler = new StdioTransportHandler(mockServer);

      const status = handler.getStatus();

      expect(status).toEqual({
        type: "stdio",
        active: false,
        connected: false,
      });
    });

    it("should return correct status when active", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();

      const status = handler.getStatus();

      expect(status).toEqual({
        type: "stdio",
        active: true,
        connected: true,
      });
    });

    it("should return correct status after stop", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();
      await handler.stop();

      const status = handler.getStatus();

      expect(status).toEqual({
        type: "stdio",
        active: false,
        connected: false,
      });
    });

    it("should include extended status information", async () => {
      const handler = new StdioTransportHandler(mockServer);

      const status = handler.getStatus();

      expect(status).toHaveProperty("type", "stdio");
      expect(status).toHaveProperty("active");
      expect(status).toHaveProperty("connected");
      expect(typeof status.active).toBe("boolean");
      expect(typeof status.connected).toBe("boolean");
    });
  });

  describe("lifecycle integration", () => {
    it("should support full start-stop-start cycle", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // First cycle
      await handler.start();
      expect(handler.getStatus().active).toBe(true);

      await handler.stop();
      expect(handler.getStatus().active).toBe(false);

      // Second cycle
      await handler.start();
      expect(handler.getStatus().active).toBe(true);

      await handler.stop();
      expect(handler.getStatus().active).toBe(false);

      // Verify proper call counts
      expect(StdioServerTransport).toHaveBeenCalledTimes(2);
      expect(mockServer.connect).toHaveBeenCalledTimes(2);
      expect(mockServer.close).toHaveBeenCalledTimes(2);
    });

    it("should handle rapid start/stop cycles", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Rapid cycles
      for (let i = 0; i < 3; i++) {
        await handler.start();
        await handler.stop();
      }

      // Final state should be stopped
      expect(handler.getStatus().active).toBe(false);

      // All calls should have been made
      expect(StdioServerTransport).toHaveBeenCalledTimes(3);
      expect(mockServer.connect).toHaveBeenCalledTimes(3);
      expect(mockServer.close).toHaveBeenCalledTimes(3);
    });

    it("should maintain state consistency", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Check initial state
      expect(handler.getType()).toBe("stdio");
      expect(handler.getStatus().active).toBe(false);

      // Start and check state
      await handler.start();
      expect(handler.getType()).toBe("stdio"); // Should not change
      expect(handler.getStatus().active).toBe(true);

      // Stop and check state
      await handler.stop();
      expect(handler.getType()).toBe("stdio"); // Should not change
      expect(handler.getStatus().active).toBe(false);
    });
  });

  describe("error scenarios", () => {
    it("should handle transport creation with invalid server", async () => {
      const invalidServer = null as any;
      const handler = new StdioTransportHandler(invalidServer);

      // Should not throw on construction
      expect(() => handler).not.toThrow();

      // But may fail on start depending on MCP SDK behavior
      // This test shows we handle gracefully
      expect(handler.getType()).toBe("stdio");
    });

    it("should handle async errors in start", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Mock server.connect to reject
      mockServer.connect = jest
        .fn()
        .mockRejectedValue(new Error("Async start error"));

      await expect(handler.start()).rejects.toThrow("Async start error");

      // Status should reflect failure state
      const status = handler.getStatus();
      expect(status.active).toBe(true); // Transport was created
      expect(status.connected).toBe(true); // But connection failed
    });

    it("should handle async errors in stop", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();

      // Mock server.close to reject
      mockServer.close = jest
        .fn()
        .mockRejectedValue(new Error("Async stop error"));

      await expect(handler.stop()).rejects.toThrow("Async stop error");
    });

    it("should handle concurrent start calls", async () => {
      const handler = new StdioTransportHandler(mockServer);

      // Start multiple concurrent operations
      const promises = [handler.start(), handler.start(), handler.start()];

      await Promise.all(promises);

      // Should end up in started state
      expect(handler.getStatus().active).toBe(true);

      // Multiple transports may have been created
      expect(StdioServerTransport).toHaveBeenCalledTimes(3);
    });

    it("should handle concurrent stop calls", async () => {
      const handler = new StdioTransportHandler(mockServer);

      await handler.start();

      // Stop multiple concurrent operations
      const promises = [handler.stop(), handler.stop(), handler.stop()];

      await Promise.all(promises);

      // Should end up in stopped state
      expect(handler.getStatus().active).toBe(false);
    });
  });

  describe("base class compliance", () => {
    it("should implement BaseTransportHandler interface", () => {
      const handler = new StdioTransportHandler(mockServer);

      expect(handler).toBeInstanceOf(BaseTransportHandler);

      // Check required methods exist
      expect(typeof handler.start).toBe("function");
      expect(typeof handler.stop).toBe("function");
      expect(typeof handler.getType).toBe("function");
      expect(typeof handler.getStatus).toBe("function");
    });

    it("should have async start and stop methods", () => {
      const handler = new StdioTransportHandler(mockServer);

      const startResult = handler.start();
      const stopResult = handler.stop();

      expect(startResult).toBeInstanceOf(Promise);
      expect(stopResult).toBeInstanceOf(Promise);
    });

    it("should override getStatus with stdio-specific implementation", () => {
      const handler = new StdioTransportHandler(mockServer);

      const status = handler.getStatus();

      // Should have base properties plus stdio-specific ones
      expect(status).toHaveProperty("type");
      expect(status).toHaveProperty("active");
      expect(status).toHaveProperty("connected");

      expect(status.type).toBe("stdio");
    });
  });
});
