/**
 * Tools manager with filtering and tool lookup capabilities
 */

import { createToolFromOperation, createMetaTools } from "./creation";
import { OpenAPISpecLoader } from "../openapi/spec-loader";
import { ITool, IToolsFilter } from "../types";
import { logger } from "../utils/logger";

/**
 * Manages tools creation, filtering, and lookup
 */
export class ToolsManager {
  private tools: Map<string, ITool> = new Map();
  private toolsByName: Map<string, ITool> = new Map();
  private metaTools: ITool[] = [];
  private specLoader: OpenAPISpecLoader;
  private disableAbbreviation: boolean;
  private namespace?: string;

  constructor(
    specLoader: OpenAPISpecLoader,
    disableAbbreviation: boolean = false,
    namespace?: string,
  ) {
    this.specLoader = specLoader;
    this.disableAbbreviation = disableAbbreviation;
    this.namespace = namespace;
    this.metaTools = createMetaTools();
  }

  /**
   * Load and filter tools based on configuration
   */
  async loadTools(filter: IToolsFilter): Promise<void> {
    logger.info(`Loading tools with mode: ${filter.mode}`);

    this.tools.clear();
    this.toolsByName.clear();

    switch (filter.mode) {
      case "dynamic":
        this.loadMetaToolsOnly();
        break;
      case "explicit":
        await this.loadExplicitTools(filter.includeTools || []);
        break;
      case "all":
      default:
        await this.loadAllTools(filter);
        break;
    }

    logger.info(`Loaded ${this.tools.size} tools`);
  }

  /**
   * Load only meta-tools for dynamic API exploration
   */
  private loadMetaToolsOnly(): void {
    logger.debug("Loading meta-tools only");

    for (const metaTool of this.metaTools) {
      this.addTool(metaTool);
    }
  }

  /**
   * Load only explicitly specified tools
   */
  private async loadExplicitTools(toolIds: string[]): Promise<void> {
    logger.debug(`Loading explicit tools: ${toolIds.join(", ")}`);

    // Always include meta-tools
    for (const metaTool of this.metaTools) {
      this.addTool(metaTool);
    }

    // Load specified endpoint tools
    const operations = this.specLoader.getOperations();

    for (const toolId of toolIds) {
      const operation = operations.find((op) => {
        const candidateId = `${op.method}::${op.path
          .replace(/^\//, "")
          .replace(/\//g, "__")
          .replace(/\{([^}]+)\}/g, "---$1")}`;
        return candidateId === toolId;
      });

      if (operation) {
        const tool = createToolFromOperation(
          operation.path,
          operation.method,
          operation.operation,
          this.disableAbbreviation,
          this.namespace,
        );
        this.addTool(tool);
      } else {
        logger.warn(`Tool not found for ID: ${toolId}`);
      }
    }
  }

  /**
   * Load all tools with optional filtering
   */
  private async loadAllTools(filter: IToolsFilter): Promise<void> {
    logger.debug("Loading all tools with filtering");

    // Always include meta-tools
    for (const metaTool of this.metaTools) {
      this.addTool(metaTool);
    }

    // Load endpoint tools
    const operations = this.specLoader.getOperations();

    for (const { path, method, operation } of operations) {
      // Apply filters
      if (!this.shouldIncludeOperation(operation, method, path, filter)) {
        continue;
      }

      const tool = createToolFromOperation(
        path,
        method,
        operation,
        this.disableAbbreviation,
        this.namespace,
      );
      this.addTool(tool);
    }
  }

  /**
   * Check if an operation should be included based on filters
   */
  private shouldIncludeOperation(
    operation: any,
    method: string,
    path: string,
    filter: IToolsFilter,
  ): boolean {
    // Tag filter
    if (filter.includeTags && filter.includeTags.length > 0) {
      if (
        !operation.tags ||
        !operation.tags.some((tag: string) => filter.includeTags!.includes(tag))
      ) {
        return false;
      }
    }

    // Operation filter (HTTP methods)
    if (filter.includeOperations && filter.includeOperations.length > 0) {
      if (!filter.includeOperations.includes(method.toUpperCase())) {
        return false;
      }
    }

    // Resource filter
    if (filter.includeResources && filter.includeResources.length > 0) {
      const pathSegments = path.replace(/^\//, "").split("/");
      const hasMatchingResource = filter.includeResources.some((resource) => {
        return pathSegments.some(
          (segment) =>
            segment.toLowerCase().includes(resource.toLowerCase()) ||
            resource.toLowerCase().includes(segment.toLowerCase()),
        );
      });

      if (!hasMatchingResource) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add a tool to the manager
   */
  private addTool(tool: ITool): void {
    if (tool.toolId) {
      this.tools.set(tool.toolId, tool);
    }
    this.toolsByName.set(tool.name, tool);
  }

  /**
   * Get all tools
   */
  getTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getToolByName(name: string): ITool | undefined {
    return this.toolsByName.get(name);
  }

  /**
   * Get tool by ID
   */
  getToolById(toolId: string): ITool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Check if a tool ID represents a meta-tool
   */
  isMetaTool(toolId: string): boolean {
    return toolId.startsWith("meta::");
  }

  /**
   * List operations with optional filtering
   */
  listOperations(filter?: { tag?: string; method?: string }): Array<{
    path: string;
    method: string;
    operationId?: string;
    summary?: string;
    tags?: string[];
  }> {
    const operations = this.specLoader.getOperations();

    return operations
      .filter(({ operation, method }) => {
        if (
          filter?.tag &&
          (!operation.tags || !operation.tags.includes(filter.tag))
        ) {
          return false;
        }
        if (filter?.method && method !== filter.method.toUpperCase()) {
          return false;
        }
        return true;
      })
      .map(({ path, method, operation }) => ({
        path,
        method,
        operationId: operation.operationId,
        summary: operation.summary,
        tags: operation.tags,
      }));
  }

  /**
   * Get tool schema by tool ID
   */
  getToolSchema(toolId: string): any {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    return {
      toolId: tool.toolId,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      method: tool.method,
      resourceName: tool.resourceName,
      originalPath: tool.originalPath,
      tags: tool.tags,
    };
  }

  /**
   * Get statistics about loaded tools
   */
  getStats(): {
    total: number;
    metaTools: number;
    endpointTools: number;
    byMethod: Record<string, number>;
    byResource: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const tools = Array.from(this.tools.values());
    const stats = {
      total: tools.length,
      metaTools: 0,
      endpointTools: 0,
      byMethod: {} as Record<string, number>,
      byResource: {} as Record<string, number>,
      byTag: {} as Record<string, number>,
    };

    for (const tool of tools) {
      if (this.isMetaTool(tool.toolId || "")) {
        stats.metaTools++;
      } else {
        stats.endpointTools++;
      }

      // Count by method
      if (tool.method) {
        stats.byMethod[tool.method] = (stats.byMethod[tool.method] || 0) + 1;
      }

      // Count by resource
      if (tool.resourceName) {
        stats.byResource[tool.resourceName] =
          (stats.byResource[tool.resourceName] || 0) + 1;
      }

      // Count by tags
      if (tool.tags) {
        for (const tag of tool.tags) {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        }
      }
    }

    return stats;
  }
}

export default ToolsManager;
