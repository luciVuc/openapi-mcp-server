/**
 * OpenAPI specification interfaces
 */
export interface IOpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, IPathItem>;
  definitions?: IOpenAPISpecComponent; // For Swagger 2.0 backward compatibility
  components?: IOpenAPISpecComponent; // For OpenAPI 3.0 compatibility
  security?: ISecurityRequirement[];
  tags?: ITag[];
}

export interface IOpenAPISpecComponent {
  schemas?: Record<string, ISchema>;
  parameters?: Record<string, IParameter>;
  responses?: Record<string, IResponse>;
  securitySchemes?: Record<string, ISecurityScheme>;
}

export interface IPathItem {
  summary?: string;
  description?: string;
  parameters?: IParameter[];
  get?: IOperation;
  post?: IOperation;
  put?: IOperation;
  patch?: IOperation;
  delete?: IOperation;
  head?: IOperation;
  options?: IOperation;
  trace?: IOperation;
}

export interface IOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: IParameter[];
  requestBody?: IRequestBody;
  responses: Record<string, IResponse>;
  security?: ISecurityRequirement[];
  deprecated?: boolean;
}

export interface IParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required?: boolean;
  description?: string;
  schema?: ISchema;
  style?: string;
  explode?: boolean;
  $ref?: string;
}

export interface IRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, IMediaType>;
}

export interface IMediaType {
  schema?: ISchema;
  example?: any;
  examples?: Record<string, IExample>;
}

export interface IResponse {
  description: string;
  headers?: Record<string, IHeader>;
  content?: Record<string, IMediaType>;
  $ref?: string;
}

export interface IHeader {
  description?: string;
  required?: boolean;
  schema?: ISchema;
}

export interface IExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface ISchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  required?: string[];
  properties?: Record<string, ISchema>;
  items?: ISchema;
  allOf?: ISchema[];
  oneOf?: ISchema[];
  anyOf?: ISchema[];
  not?: ISchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | ISchema;
  $ref?: string;
}

export interface ISecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, any>;
  openIdConnectUrl?: string;
}

export interface ISecurityRequirement {
  [key: string]: string[];
}

export interface ITag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}
