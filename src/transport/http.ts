/**
 * HTTP transport handler for MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as http from "http";
import { BaseTransportHandler } from "./base";
import { logger } from "../utils/logger";
import { ITransportConfig } from "../types";

/**
 * HTTP transport handler implementation
 * Note: This is a basic implementation. For production use,
 * consider using a more robust HTTP transport implementation.
 */
export class HttpTransportHandler extends BaseTransportHandler {
  private httpServer: http.Server | null = null;
  private config: Required<
    Pick<ITransportConfig, "httpPort" | "httpHost" | "endpointPath">
  >;

  constructor(
    server: Server,
    config: Required<
      Pick<ITransportConfig, "httpPort" | "httpHost" | "endpointPath">
    >,
  ) {
    super(server);
    this.config = config;
  }

  /**
   * Start the HTTP transport
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        this.handleRequest(req, res).catch((error) => {
          logger.error(
            `HTTP request error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          }
        });
      });

      this.httpServer.on("error", (error) => {
        logger.error(`HTTP server error: ${error.message}`);
        reject(error);
      });

      this.httpServer.listen(this.config.httpPort, this.config.httpHost, () => {
        logger.info(
          `HTTP transport listening on ${this.config.httpHost}:${this.config.httpPort}${this.config.endpointPath}`,
        );
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP transport
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          logger.debug("HTTP transport stopped");
          this.httpServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get transport type identifier
   */
  getType(): string {
    return "http";
  }

  /**
   * Get detailed status information
   */
  getStatus(): {
    type: string;
    active: boolean;
    listening: boolean;
    address?: string;
    port?: number;
    endpoint?: string;
  } {
    const isListening = this.httpServer?.listening || false;
    return {
      type: this.getType(),
      active: this.httpServer !== null,
      listening: isListening,
      address: isListening ? this.config.httpHost : undefined,
      port: isListening ? this.config.httpPort : undefined,
      endpoint: isListening ? this.config.endpointPath : undefined,
    };
  }

  /**
   * Handle HTTP requests
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    // Check if request is for our endpoint
    if (!req.url?.startsWith(this.config.endpointPath)) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    // For now, return a simple JSON response indicating the server is running
    // In a full implementation, this would handle MCP protocol over HTTP
    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          name: "OpenAPI MCP Server",
          version: "1.0.0",
          transport: "http",
          status: "running",
          endpoint: this.config.endpointPath,
          address: `${this.config.httpHost}:${this.config.httpPort}`,
          message:
            "For full MCP support, use stdio transport. HTTP transport is experimental.",
        }),
      );
    } else {
      res.statusCode = 501;
      res.end(
        "HTTP transport not fully implemented yet. Please use stdio transport.",
      );
    }
  }
}

export default HttpTransportHandler;
