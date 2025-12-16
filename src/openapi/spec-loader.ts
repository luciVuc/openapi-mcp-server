/**
 * OpenAPI specification loading and processing
 */

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as yaml from "yaml";
import { logger } from "../utils/logger";
import { IOpenAPISpec, IOperation, SpecInputMethod } from "../types";

/**
 * Load OpenAPI specification from various sources
 */
export class OpenAPISpecLoader {
  private spec: IOpenAPISpec | null = null;
  private resolvedRefs: Map<string, any> = new Map();

  /**
   * Load OpenAPI specification from the specified source
   *
   * @param specSource - The spec content, path, or URL
   * @param inputMethod - How to interpret the specSource
   * @returns Promise resolving to the loaded spec
   */
  async loadSpec(
    specSource: string,
    inputMethod: SpecInputMethod,
  ): Promise<IOpenAPISpec> {
    logger.debug(`Loading OpenAPI spec using method: ${inputMethod}`);

    let rawContent: string;

    switch (inputMethod) {
      case "url":
        rawContent = await this.loadFromUrl(specSource);
        break;
      case "file":
        rawContent = await this.loadFromFile(specSource);
        break;
      case "stdin":
        rawContent = await this.loadFromStdin();
        break;
      case "inline":
        rawContent = specSource;
        break;
      default:
        throw new Error(`Unsupported spec input method: ${inputMethod}`);
    }

    this.spec = this.parseSpec(rawContent);
    await this.resolveReferences();

    logger.info(
      `Successfully loaded OpenAPI spec: ${this.spec.info.title} v${this.spec.info.version}`,
    );
    return this.spec;
  }

  /**
   * Get the loaded specification
   */
  getSpec(): IOpenAPISpec {
    if (!this.spec) {
      throw new Error(
        "No OpenAPI specification loaded. Call loadSpec() first.",
      );
    }
    return this.spec;
  }

  /**
   * Check if a specification is loaded
   */
  isLoaded(): boolean {
    return this.spec !== null;
  }

  /**
   * Load spec from URL
   */
  private async loadFromUrl(url: string): Promise<string> {
    try {
      logger.debug(`Fetching OpenAPI spec from URL: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          Accept: "application/json, application/yaml, text/yaml, text/plain",
        },
      });
      return typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to load OpenAPI spec from URL ${url}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Load spec from local file
   */
  private async loadFromFile(filePath: string): Promise<string> {
    try {
      logger.debug(`Reading OpenAPI spec from file: ${filePath}`);
      const resolvedPath = path.resolve(filePath);

      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`OpenAPI spec file not found: ${resolvedPath}`);
      }

      return fs.readFileSync(resolvedPath, "utf8");
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load OpenAPI spec from file ${filePath}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Load spec from stdin
   */
  private async loadFromStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";

      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk) => {
        data += chunk;
      });

      process.stdin.on("end", () => {
        if (!data.trim()) {
          reject(new Error("No data received from stdin"));
        } else {
          resolve(data);
        }
      });

      process.stdin.on("error", (error) => {
        reject(new Error(`Failed to read from stdin: ${error.message}`));
      });
    });
  }

  /**
   * Parse OpenAPI spec from raw content (JSON or YAML)
   */
  private parseSpec(content: string): IOpenAPISpec {
    try {
      // Try JSON first
      if (content?.trim().startsWith("{")) {
        return JSON.parse(content);
      }

      // Fall back to YAML
      return yaml.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAPI specification: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Resolve $ref references in the specification
   */
  private async resolveReferences(): Promise<void> {
    if (!this.spec) return;

    // Resolve references in paths
    for (const [pathKey, pathItem] of Object.entries(this.spec.paths)) {
      this.spec.paths[pathKey] = await this.resolveObjectReferences(pathItem);
    }

    // Resolve references in components
    if (this.spec.components) {
      for (const [componentType, components] of Object.entries(
        this.spec.components,
      )) {
        if (components && typeof components === "object") {
          for (const [componentKey, component] of Object.entries(components)) {
            (this.spec.components as any)[componentType][componentKey] =
              await this.resolveObjectReferences(component);
          }
        }
      }
    }

    // Resolve references in definitions (OpenAPI v2)
    if (this.spec.definitions) {
      for (const [componentType, definitions] of Object.entries(
        this.spec.definitions,
      )) {
        if (definitions && typeof definitions === "object") {
          for (const [componentKey, component] of Object.entries(definitions)) {
            (this.spec.definitions as any)[componentType][componentKey] =
              await this.resolveObjectReferences(component);
          }
        }
      }
    }
  }

  /**
   * Recursively resolve references in an object
   */
  private async resolveObjectReferences(
    obj: any,
    visited: Set<string> = new Set(),
  ): Promise<any> {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    // Handle $ref
    if (obj.$ref && typeof obj.$ref === "string") {
      if (visited.has(obj.$ref)) {
        logger.warn(`Circular reference detected: ${obj.$ref}`);
        return { description: "Circular reference" };
      }

      const resolved = await this.resolveReference(obj.$ref);
      if (resolved) {
        visited.add(obj.$ref);
        const result = await this.resolveObjectReferences(resolved, visited);
        visited.delete(obj.$ref);
        return result;
      }
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item) => this.resolveObjectReferences(item, visited)),
      );
    }

    // Handle objects
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = await this.resolveObjectReferences(value, visited);
    }

    return resolved;
  }

  /**
   * Resolve a single $ref reference
   */
  private async resolveReference(ref: string): Promise<any> {
    if (this.resolvedRefs.has(ref)) {
      return this.resolvedRefs.get(ref);
    }

    try {
      // Only handle internal references for now
      if (!ref.startsWith("#/")) {
        logger.warn(`External reference not supported: ${ref}`);
        return this.createGenericSchema(`External reference not supported: ${ref}`);
      }

      // Parse internal reference path
      const path = ref.substring(2).split("/");
      let current: any = this.spec;

      for (const segment of path) {
        if (!current || typeof current !== "object") {
          throw new Error(`Invalid reference path: ${ref}`);
        }
        current = current[segment];
      }

      if (current === undefined) {
        throw new Error(`Reference not found: ${ref}`);
      }

      this.resolvedRefs.set(ref, current);
      return current;
    } catch (error) {
      logger.warn(
        `Failed to resolve reference ${ref}: ${error instanceof Error ? error.message : "Unknown error"}. Using generic schema as fallback.`,
      );
      const fallbackSchema = this.createGenericSchema(`Failed to resolve reference: ${ref}`);
      this.resolvedRefs.set(ref, fallbackSchema);
      return fallbackSchema;
    }
  }

  /**
   * Create a generic schema that accepts any properties
   */
  private createGenericSchema(description: string): any {
    return {
      type: "object",
      description: description,
      properties: {},
      additionalProperties: true,
      "x-fallback-schema": true
    };
  }

  /**
   * Get all operations from the spec
   */
  getOperations(): Array<{
    path: string;
    method: string;
    operation: IOperation;
  }> {
    if (!this.spec) {
      throw new Error("No specification loaded");
    }

    const operations: Array<{
      path: string;
      method: string;
      operation: IOperation;
    }> = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      const methods = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options",
        "trace",
      ];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (operation) {
          operations.push({ path, method: method.toUpperCase(), operation });
        }
      }
    }

    return operations;
  }

  /**
   * Get all tags from the spec
   */
  getTags(): string[] {
    if (!this.spec) {
      throw new Error("No specification loaded");
    }

    const tags = new Set<string>();

    // Add global tags
    if (this.spec.tags) {
      this.spec.tags.forEach((tag) => tags.add(tag.name));
    }

    // Add operation tags
    this.getOperations().forEach(({ operation }) => {
      if (operation.tags) {
        operation.tags.forEach((tag) => tags.add(tag));
      }
    });

    return Array.from(tags);
  }
}

export default OpenAPISpecLoader;
