/**
 * Extended MCP Tool interfaces and tool creation utilities
 */
import { IOperation, IParameter } from "../types";
import { generateToolId, extractResourceName } from "./utils/id-generator";
import { generateToolName } from "./utils/name-generator";
import { logger } from "../utils/logger";
import { ITool } from "../types";

/**
 * Create an MCP tool from an OpenAPI operation
 */
export function createToolFromOperation(
  path: string,
  method: string,
  operation: IOperation,
  disableAbbreviation: boolean = false,
  namespace?: string,
): ITool {
  const toolId = generateToolId(method, path);
  const resourceName = extractResourceName(path);

  // Generate tool name from operationId, summary, or fallback
  let toolName: string;
  if (operation.operationId) {
    toolName = generateToolName(operation.operationId, disableAbbreviation, namespace);
  } else if (operation.summary) {
    toolName = generateToolName(operation.summary, disableAbbreviation, namespace);
  } else {
    // Fallback: generate from method and path
    const pathParts = path.split("/").filter((p) => p && !p.startsWith("{"));
    const baseName =
      pathParts.length > 0 ? pathParts[pathParts.length - 1] : "endpoint";
    toolName = generateToolName(
      `${method.toLowerCase()}-${baseName}`,
      disableAbbreviation,
      namespace,
    );
  }

  // Create tool description
  const description = createToolDescription(path, method, operation);

  // Create input schema
  const inputSchema = createInputSchema(path, method, operation);

  const tool: ITool = {
    name: toolName,
    description,
    inputSchema,
    tags: operation.tags || [],
    method: method.toUpperCase(),
    resourceName,
    originalPath: path,
    toolId,
  };

  logger.debug(`Created tool: ${toolName} (${toolId})`);
  return tool;
}

/**
 * Create tool description from operation metadata
 */
function createToolDescription(
  path: string,
  method: string,
  operation: IOperation,
): string {
  let description = `${method.toUpperCase()} ${path}`;

  if (operation.summary) {
    description += `\n\n${operation.summary}`;
  }

  if (operation.description) {
    description += `\n\n${operation.description}`;
  }

  if (operation.deprecated) {
    description += "\n\n⚠️ This operation is deprecated.";
  }

  return description;
}

/**
 * Create unified input schema by merging parameters and request body
 */
function createInputSchema(
  path: string,
  method: string,
  operation: IOperation,
): any {
  const schema: any = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };

  // Add path parameters
  const pathParams = extractPathParameters(path);
  pathParams.forEach((param) => {
    addParameterToSchema(schema, param, true); // Path params are always required
  });

  // Add operation parameters
  if (operation.parameters) {
    operation.parameters.forEach((param) => {
      addParameterToSchema(schema, param, param.required || false);
    });
  }

  // Add request body if present
  if (operation.requestBody && hasJsonContent(operation.requestBody.content)) {
    const bodySchema = getJsonContentSchema(operation.requestBody.content);

    if (bodySchema) {
      // If the body schema is an object, merge its properties
      if (bodySchema.type === "object" && bodySchema.properties) {
        Object.entries(bodySchema.properties).forEach(
          ([propName, propSchema]) => {
            schema.properties[propName] = propSchema;
            if (bodySchema.required && bodySchema.required.includes(propName)) {
              schema.required.push(propName);
            }
          },
        );
      } else {
        // Otherwise, wrap the entire body schema in a 'body' property
        schema.properties.body = bodySchema;
        if (operation.requestBody?.required) {
          schema.required.push("body");
        }
      }
    }
  }

  return schema;
}

/**
 * Extract path parameters from an OpenAPI path
 */
function extractPathParameters(path: string): IParameter[] {
  const paramNames = [];
  const regex = /\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    paramNames.push(match[1]);
  }

  return paramNames.map((name) => ({
    name,
    in: "path" as const,
    required: true,
    schema: { type: "string" },
  }));
}

/**
 * Add a parameter to the input schema
 */
function addParameterToSchema(
  schema: any,
  param: IParameter,
  required: boolean,
): void {
  const paramSchema = param.schema || { type: "string" };

  // Add parameter location metadata
  const extendedSchema = {
    ...paramSchema,
    "x-parameter-location": param.in,
  };

  if (param.description) {
    extendedSchema.description = param.description;
  }

  schema.properties[param.name] = extendedSchema;

  if (required) {
    schema.required.push(param.name);
  }
}

/**
 * Check if request body content includes JSON
 */
function hasJsonContent(content: Record<string, any>): boolean {
  if (!content || typeof content !== "object") {
    return false;
  }
  return Object.keys(content).some(
    (contentType) =>
      contentType.includes("application/json") ||
      contentType.includes("application/vnd.api+json"),
  );
}

/**
 * Get schema from JSON content
 */
function getJsonContentSchema(content: Record<string, any>): any {
  // Prioritize application/json
  if (content["application/json"]?.schema) {
    return content["application/json"].schema;
  }

  // Look for any JSON-like content type
  for (const [contentType, mediaType] of Object.entries(content)) {
    if (
      (contentType.includes("json") || contentType.includes("vnd.api+json")) &&
      mediaType.schema
    ) {
      return mediaType.schema;
    }
  }

  return null;
}

/**
 * Create dynamic meta-tools for API exploration
 */
export function createMetaTools(): ITool[] {
  return [
    {
      name: "list-api-endpoints",
      description:
        "List all available API endpoints from the OpenAPI specification",
      inputSchema: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description: "Filter endpoints by OpenAPI tag",
          },
          method: {
            type: "string",
            description: "Filter endpoints by HTTP method",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
          },
        },
        additionalProperties: false,
      },
      toolId: "meta::list-endpoints",
    },
    {
      name: "get-api-endpoint-schema",
      description:
        "Get detailed schema information for a specific API endpoint",
      inputSchema: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description: "The tool ID of the endpoint to get schema for",
          },
        },
        required: ["toolId"],
        additionalProperties: false,
      },
      toolId: "meta::get-endpoint-schema",
    },
    {
      name: "invoke-api-endpoint",
      description:
        "Invoke any API endpoint directly by tool ID with parameters",
      inputSchema: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description: "The tool ID of the endpoint to invoke",
          },
          parameters: {
            type: "object",
            description: "Parameters to pass to the endpoint",
            additionalProperties: true,
          },
        },
        required: ["toolId"],
        additionalProperties: false,
      },
      toolId: "meta::invoke-endpoint",
    },
  ];
}
