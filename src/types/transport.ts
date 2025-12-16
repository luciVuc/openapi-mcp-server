import { TransportType } from "./core";

/**
 * Transport configuration
 */
export interface ITransportConfig {
  type: TransportType;
  httpPort?: number;
  httpHost?: string;
  endpointPath?: string;
}

/**
 * Transport handler interface
 */
export interface ITransportHandler {
  start(): Promise<void>;
  stop(): Promise<void>;
}
