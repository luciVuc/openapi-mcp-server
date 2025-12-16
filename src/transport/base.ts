/**
 * Base transport interface and common functionality
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ITransportConfig, ITransportHandler } from "../types";

/**
 * Abstract base class for transport handlers
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseTransportHandler implements ITransportHandler {
  protected server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Start the transport handler
   */
  abstract start(): Promise<void>;

  /**
   * Stop the transport handler
   */
  abstract stop(): Promise<void>;

  /**
   * Get the transport type identifier
   */
  abstract getType(): string;

  /**
   * Get basic status information
   */
  getStatus(): { type: string; active: boolean } {
    return {
      type: this.getType(),
      active: true, // Subclasses can override this logic
    };
  }
}

/**
 * Create transport handler based on configuration
 */
export async function createTransportHandler(
  server: Server,
  config: ITransportConfig,
): Promise<ITransportHandler> {
  // Import dynamically to avoid circular dependencies
  switch (config.type) {
    case "stdio": {
      const { StdioTransportHandler } = await import("./stdio");
      return new StdioTransportHandler(server);
    }
    case "http": {
      const { HttpTransportHandler } = await import("./http");
      return new HttpTransportHandler(server, {
        httpPort: config.httpPort || 3000,
        httpHost: config.httpHost || "127.0.0.1",
        endpointPath: config.endpointPath || "/mcp",
      });
    }
    default:
      throw new Error(`Unsupported transport type: ${(config as any).type}`);
  }
}

export default BaseTransportHandler;
