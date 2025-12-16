import { SpecInputMethod, ToolsMode, TransportType } from "./core";
import { IAuthProvider } from "./auth";

/**
 * Configuration for the OpenAPI MCP Server
 */
export interface IOpenAPIServerConfig {
  /** Server name for MCP identification */
  name?: string;

  /** Server version */
  version?: string;

  /** Namespace for the MCP server tools */
  namespace?: string;

  /** Base URL for the API endpoints */
  apiBaseUrl: string;

  /** OpenAPI specification content/path/URL */
  openApiSpec?: string;

  /** How to load the OpenAPI specification */
  specInputMethod?: SpecInputMethod;

  /** Static headers for API requests (ignored if authProvider is provided) */
  headers?: Record<string, string>;

  /** Dynamic authentication provider */
  authProvider?: IAuthProvider;

  /** Transport type to use */
  transportType?: TransportType;

  /** Port for HTTP transport */
  httpPort?: number;

  /** Host for HTTP transport */
  httpHost?: string;

  /** Endpoint path for HTTP transport */
  endpointPath?: string;

  /** Tools loading mode */
  toolsMode?: ToolsMode;

  /** Specific tools to include (used with explicit mode or as filter) */
  includeTools?: string[];

  /** Tags to filter tools by */
  includeTags?: string[];

  /** Resource paths to filter tools by */
  includeResources?: string[];

  /** HTTP operations to filter tools by */
  includeOperations?: string[];

  /** Disable tool name abbreviation */
  disableAbbreviation?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}
