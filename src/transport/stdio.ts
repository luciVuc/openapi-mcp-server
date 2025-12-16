/**
 * Stdio transport handler for MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BaseTransportHandler } from "./base";
import { logger } from "../utils/logger";

/**
 * Stdio transport handler implementation
 * Handles MCP protocol communication over standard input/output
 */
export class StdioTransportHandler extends BaseTransportHandler {
  private transport: StdioServerTransport | null = null;

  constructor(server: Server) {
    super(server);
  }

  /**
   * Start the stdio transport
   */
  async start(): Promise<void> {
    logger.info("Starting stdio transport");
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    logger.debug("Stdio transport connected");
  }

  /**
   * Stop the stdio transport
   */
  async stop(): Promise<void> {
    logger.debug("Stopping stdio transport");
    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }
  }

  /**
   * Get transport type identifier
   */
  getType(): string {
    return "stdio";
  }

  /**
   * Get detailed status information
   */
  getStatus(): { type: string; active: boolean; connected: boolean } {
    return {
      type: this.getType(),
      active: this.transport !== null,
      connected: this.transport !== null,
    };
  }
}

export default StdioTransportHandler;
