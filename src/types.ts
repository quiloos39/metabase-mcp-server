export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  servers?: Server[];
}

export interface Server {
  url: string;
  description?: string;
}

export interface PathItem {
  [method: string]: Operation;
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema: Schema;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface MediaType {
  schema: Schema;
  resolvedSchema?: Schema;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, Header>;
}

export interface Header {
  description?: string;
  schema: Schema;
}

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  $ref?: string;
  enum?: any[];
  format?: string;
  description?: string;
  additionalProperties?: boolean | Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
}

export interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
}

export interface SecurityRequirement {
  [key: string]: string[];
}

export interface APIEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  operationId?: string;
  tags?: string[];
}

export interface MetabaseConfig {
  baseUrl?: string;
  apiKey?: string;
  sessionToken?: string;
  username?: string;
  password?: string;
}

export interface APICallArgs {
  path: string;
  method: string;
  headers?: Record<string, string>;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number | boolean>;
  body?: any;
  selectors?: string[];
}

export interface ListAPIArgs {
  category?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetAPIArgs {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, any>;
  data: any;
}

export interface APIError {
  error: true;
  status?: number;
  statusText?: string;
  message: string;
  data?: any;
}

export interface ListAPIResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  endpoints: {
    path: string;
    method: string;
    summary?: string;
    operationId?: string;
  }[];
}

export interface GetAPIResponse {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags: string[];
}

// Tool interfaces
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ToolHandler {
  definition: ToolDefinition;
  handler: (args: any) => Promise<string>;
}

// Resource interfaces
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MetabaseCard {
  id: number;
  name: string;
  description?: string;
  dataset_query: any;
  display: string;
  visualization_settings: any;
  collection_id?: number;
  created_at: string;
  updated_at: string;
  creator_id: number;
}

export interface MetabaseDashboard {
  id: number;
  name: string;
  description?: string;
  collection_id?: number;
  created_at: string;
  updated_at: string;
  creator_id: number;
  dashcards: any[];
}

export interface MetabaseDatabase {
  id: number;
  name: string;
  description?: string;
  engine: string;
  created_at: string;
  updated_at: string;
  is_sample: boolean;
  is_full_sync: boolean;
}