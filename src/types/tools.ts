import { Tool } from "@modelcontextprotocol/sdk/types";
import { ToolsMode } from "./core";

/**
 * Extended tool interface with metadata for efficient filtering
 */
export interface ITool extends Tool {
  /** OpenAPI tags associated with this tool's operation */
  tags?: string[];
  /** HTTP method for this tool */
  method?: string;
  /** Resource name extracted from the path */
  resourceName?: string;
  /** Original OpenAPI path */
  originalPath?: string;
  /** Tool ID for easy lookup */
  toolId?: string;
}

/**
 * Filter configuration for tools
 */
export interface IToolsFilter {
  /** Tools loading mode */
  mode: ToolsMode;
  /** Specific tools to include (used with explicit mode or as filter) */
  includeTools?: string[];
  /** Tags to filter tools by */
  includeTags?: string[];
  /** Resource paths to filter tools by */
  includeResources?: string[];
  /** HTTP operations to filter tools by */
  includeOperations?: string[];
}
