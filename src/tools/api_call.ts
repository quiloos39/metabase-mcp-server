import { ToolHandler, APICallArgs } from "../types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import fs from "fs";
import path from "path";

// Helper functions for response processing
interface SchemaDefinitions {
  [key: string]: any;
}

function generateSchemaWithDeduplication(data: any, path: string = "root", maxDepth: number = 3, currentDepth: number = 0): { schema: any; definitions: SchemaDefinitions } {
  const definitions: SchemaDefinitions = {};
  const schemaMap = new Map<string, string>();
  
  function generateSchemaInternal(data: any, path: string): any {
    if (currentDepth >= maxDepth) {
      return {
        type: typeof data === 'object' && data !== null ? (Array.isArray(data) ? 'array' : 'object') : typeof data,
        path,
        truncated: true,
        note: `Schema truncated at depth ${maxDepth}. Use selectors to access nested data.`
      };
    }
    
    if (data === null) {
      return { type: "null", path };
    }
    
    if (Array.isArray(data)) {
      const schema: any = {
        type: "array",
        path,
        count: data.length,
        itemSchema: data.length > 0 ? generateSchemaInternal(data[0], `${path}[0]`) : { type: "unknown" }
      };
      
      // Add indices for selection (limit to first 5 items)
      const maxIndices = 5;
      schema.selectableIndices = data.slice(0, maxIndices).map((_, index) => ({
        index,
        path: `${path}[${index}]`,
        preview: getPreview(data[index])
      }));
      
      if (data.length > maxIndices) {
        schema.totalCount = data.length;
        schema.note = `Showing first ${maxIndices} of ${data.length} items. Use selectors like '${path}[index]' to access specific items.`;
      }
      
      return schema;
    }
    
    if (data && typeof data === 'object') {
      // Create a signature for this object structure
      const keys = Object.keys(data).sort();
      const signature = keys.map(key => `${key}:${Array.isArray(data[key]) ? 'array' : typeof data[key]}`).join(',');
      
      // Check if we've seen this structure before
      if (schemaMap.has(signature)) {
        const refName = schemaMap.get(signature)!;
        return { $ref: `#/definitions/${refName}`, path };
      }
      
      const schema: any = {
        type: "object",
        path,
        properties: {}
      };
      
      // Add selectable fields
      schema.selectableFields = [];
      
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = `${path}.${key}`;
        const { schema: nestedSchema } = generateSchemaWithDeduplication(value, fieldPath, maxDepth, currentDepth + 1);
        schema.properties[key] = nestedSchema;
        schema.selectableFields.push({
          field: key,
          path: fieldPath,
          type: Array.isArray(value) ? "array" : typeof value,
          preview: getPreview(value)
        });
      }
      
      // If this object has multiple properties, consider it for deduplication
      if (keys.length > 1) {
        const refName = `Schema_${Object.keys(definitions).length + 1}`;
        schemaMap.set(signature, refName);
        definitions[refName] = { ...schema };
        definitions[refName].path = undefined; // Remove path from definition
        return { $ref: `#/definitions/${refName}`, path };
      }
      
      return schema;
    }
    
    return {
      type: typeof data,
      path,
      value: data
    };
  }
  
  const schema = generateSchemaInternal(data, path);
  return { schema, definitions };
}

function generateSchema(data: any, path: string = "root", maxDepth: number = 3): any {
  const { schema, definitions } = generateSchemaWithDeduplication(data, path, maxDepth);
  
  if (Object.keys(definitions).length > 0) {
    return {
      ...schema,
      definitions
    };
  }
  
  return schema;
}


function getPreview(data: any): string {
  if (data === null || data === undefined) return "null";
  if (typeof data === "string") return data.length > 50 ? `"${data.substring(0, 50)}..."` : `"${data}"`;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) return `Array(${data.length})`;
  if (typeof data === "object") {
    const keys = Object.keys(data);
    return `Object{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : "}"}`;
  }
  return String(data);
}

function selectFromResponse(data: any, selectors: string[]): any {
  const result: any = {};
  
  for (const selector of selectors) {
    try {
      const value = getValueByPath(data, selector);
      if (value !== undefined) {
        // For wildcard selectors that return arrays of primitive values, don't apply schema transformation
        if (Array.isArray(value) && selector.includes("[*]")) {
          // Check if all values are primitives (not objects)
          const allPrimitives = value.every(v => 
            v === null || v === undefined || 
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
          );
          
          if (allPrimitives) {
            result[selector] = value;
          } else {
            result[selector] = replaceNestedObjectsWithSchema(value, selector);
          }
        } else {
          result[selector] = replaceNestedObjectsWithSchema(value, selector);
        }
      }
    } catch (error) {
      result[selector] = { error: `Invalid path: ${selector}` };
    }
  }
  
  return result;
}

function replaceNestedObjectsWithSchema(data: any, basePath: string): any {
  const globalDefinitions: SchemaDefinitions = {};
  
  function processValue(value: any, path: string): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item && typeof item === 'object') {
          const { schema, definitions } = generateSchemaWithDeduplication(item, `${path}[${index}]`);
          Object.assign(globalDefinitions, definitions);
          return {
            __schema: schema,
            __note: `Object at index ${index} - use selectors to access specific fields`
          };
        }
        return item;
      });
    }
    
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        if (nestedValue && typeof nestedValue === 'object') {
          const { schema, definitions } = generateSchemaWithDeduplication(nestedValue, `${path}.${key}`);
          Object.assign(globalDefinitions, definitions);
          result[key] = {
            __schema: schema,
            __note: `Object field '${key}' - use selectors to access specific fields`
          };
        } else {
          result[key] = nestedValue;
        }
      }
      return result;
    }
    
    return value;
  }
  
  const processedData = processValue(data, basePath);
  
  // Add global definitions if any exist
  if (Object.keys(globalDefinitions).length > 0) {
    return {
      ...processedData,
      __definitions: globalDefinitions
    };
  }
  
  return processedData;
}

function getValueByPath(obj: any, path: string): any {
  if (path === "root") return obj;
  
  return getValueByPathInternal(obj, path, 0);
}

function getValueByPathInternal(obj: any, path: string, pathIndex: number): any {
  const parts = path.replace(/^root\.?/, "").split(/[.\[\]]/).filter(Boolean);
  
  if (pathIndex >= parts.length) {
    return obj;
  }
  
  const part = parts[pathIndex];
  
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  // Handle wildcard for arrays
  if (part === "*" && Array.isArray(obj)) {
    const results: any[] = [];
    for (let i = 0; i < obj.length; i++) {
      const result = getValueByPathInternal(obj[i], path, pathIndex + 1);
      if (result !== undefined) {
        results.push(result);
      }
    }
    return results.length > 0 ? results : undefined;
  }
  
  // Handle range for arrays (e.g., "0:100", "5:15")
  if (part.includes(":") && Array.isArray(obj)) {
    const [startStr, endStr] = part.split(":");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    
    if (isNaN(start) || isNaN(end) || start < 0 || end < start) {
      return undefined;
    }
    
    const actualEnd = Math.min(end, obj.length);
    const results: any[] = [];
    
    for (let i = start; i < actualEnd; i++) {
      const result = getValueByPathInternal(obj[i], path, pathIndex + 1);
      if (result !== undefined) {
        results.push(result);
      }
    }
    return results.length > 0 ? results : undefined;
  }
  
  // Handle normal array index
  if (Array.isArray(obj)) {
    const index = parseInt(part, 10);
    if (isNaN(index) || index < 0 || index >= obj.length) {
      return undefined;
    }
    return getValueByPathInternal(obj[index], path, pathIndex + 1);
  }
  
  // Handle object property
  if (typeof obj === "object") {
    if (!(part in obj)) {
      return undefined;
    }
    return getValueByPathInternal(obj[part], path, pathIndex + 1);
  }
  
  return undefined;
}

function generateUniqueFilename(basePath: string, prefix: string = "api_response"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).substring(7);
  return path.join(basePath, `${prefix}_${timestamp}_${randomSuffix}.json`);
}

function saveResponseToFile(data: any): string {
  const tmpDir = "/tmp";
  const filePath = generateUniqueFilename(tmpDir, "metabase_api");
  
  // Ensure /tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}


export function createApiCallTool(): ToolHandler {
  return {
    definition: {
      name: "api_call",
      description: "Execute a Metabase API call with the specified parameters. Uses METABASE_URL and METABASE_API_KEY environment variables for authentication.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The API endpoint path (e.g., '/api/card')",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "The HTTP method",
          },
          headers: {
            type: "object",
            description: "Additional headers to include in the request",
            additionalProperties: { type: "string" },
          },
          pathParams: {
            type: "object",
            description: "Path parameters to substitute in the URL (e.g., {'card-id': '123'})",
            additionalProperties: { type: ["string", "number"] },
          },
          queryParams: {
            type: "object",
            description: "Query parameters to append to the URL",
            additionalProperties: { type: ["string", "number", "boolean"] },
          },
          body: {
            type: "object",
            description: "Request body for POST/PUT requests",
          },
          selectors: {
            type: "array",
            items: { type: "string" },
            description: "Select specific data from the response using path selectors (e.g., ['root.data[0].name', 'root.status']). Use this after getting the schema to extract specific values.",
          },
        },
        required: ["path", "method"],
        additionalProperties: false,
      },
    },
    handler: async (args: APICallArgs): Promise<string> => {
      const {
        path,
        method,
        headers = {},
        pathParams = {},
        queryParams = {},
        body,
        selectors,
      } = args;

      // Get required config from environment
      const baseUrl = process.env.METABASE_URL;
      const apiKey = process.env.METABASE_API_KEY;

      // Validate required environment variables
      if (!baseUrl) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          "METABASE_URL environment variable is required"
        );
      }

      if (!apiKey) {
        throw new McpError(
          ErrorCode.InvalidParams, 
          "METABASE_API_KEY environment variable is required"
        );
      }

      try {
        // Substitute path parameters
        let finalPath = path;
        for (const [key, value] of Object.entries(pathParams)) {
          finalPath = finalPath.replace(`{${key}}`, String(value));
        }

        // Build full URL
        const url = `${baseUrl.replace(/\/$/, "")}${finalPath}`;

        // Prepare headers
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };

        // Add authentication
        requestHeaders["x-api-key"] = apiKey;

        // Prepare axios config
        const axiosConfig: AxiosRequestConfig = {
          method: method.toLowerCase() as any,
          url,
          headers: requestHeaders,
          params: queryParams,
          timeout: 30000,
        };

        // Add body for POST/PUT/PATCH requests
        if (["POST", "PUT", "PATCH"].includes(method.toUpperCase()) && body) {
          axiosConfig.data = body;
        }

        // Make the API call
        const response: AxiosResponse = await axios(axiosConfig);

        // Check if this is a creation operation and extract URL
        let resourceUrl: string | undefined;
        if (method.toUpperCase() === "POST" && response.status === 200 && response.data?.id) {
          const resourceId = response.data.id;
          
          // Generate URLs for created resources
          if (finalPath === "/api/card" || finalPath.startsWith("/api/card/")) {
            // Question/Card creation
            resourceUrl = `${baseUrl}/question/${resourceId}`;
          } else if (finalPath === "/api/dashboard" || finalPath.startsWith("/api/dashboard/")) {
            // Dashboard creation
            resourceUrl = `${baseUrl}/dashboard/${resourceId}`;
          } else if (finalPath === "/api/collection" || finalPath.startsWith("/api/collection/")) {
            // Collection creation
            resourceUrl = `${baseUrl}/collection/${resourceId}`;
          }
        }

        // Process response data
        let processedData = response.data;
        
        // Handle selectors for specific data extraction
        if (selectors && selectors.length > 0) {
          processedData = selectFromResponse(response.data, selectors);
        } else {
          // Always generate full schema regardless of size
          processedData = generateSchema(response.data, "root", 5); // Use consistent depth
        }

        // Build final result with full data
        const fullResult: any = {
          status: response.status,
          statusText: response.statusText,
          data: processedData,
        };
        
        // Add tool usage guidance
        if (!selectors || selectors.length === 0) {
          const guidance: any = {
            message: "Schema returned. Use the 'selectors' parameter to extract specific values from the response.",
            selectorSyntax: {
              wildcards: {
                description: "Use '*' to select from all array items",
                examples: [
                  "root[*].id - Get all IDs from array items",
                  "root[*].name - Get all names from array items", 
                  "root[*].collection.name - Get nested field from all items"
                ]
              },
              ranges: {
                description: "Use 'start:end' to select a range of array items",
                examples: [
                  "root[0:10].name - Get names from first 10 items",
                  "root[5:15].id - Get IDs from items 5 through 14",
                  "root[0:100].collection.name - Get collection names from first 100 items"
                ],
                notes: [
                  "Range is exclusive of end index (0:10 gets items 0-9)",
                  "End index is automatically capped at array length",
                  "Invalid ranges (negative start, end < start) return undefined"
                ]
              },
              indexing: {
                description: "Use specific indices to select individual items",
                examples: [
                  "root[0].name - Get name from first item",
                  "root[5].id - Get ID from sixth item",
                  "root[0].metadata[2].type - Access nested arrays with indices"
                ]
              },
              fieldAccess: {
                description: "Access object properties using dot notation",
                examples: [
                  "root.status - Get top-level field",
                  "root.user.email - Get nested field",
                  "root.settings.display.theme - Access deeply nested properties"
                ]
              }
            },
            example: "To get specific data, use selectors like: ['root[0:10].name', 'root[*].id', 'root[5].type', 'root.status']"
          };
          
          fullResult.toolResponse = guidance;
        }

        // Add resource URL if available
        if (resourceUrl) {
          fullResult.resourceUrl = resourceUrl;
          fullResult.message = `Resource created successfully. You can access it at: ${resourceUrl}`;
        }

        // Check response size to determine output method
        const responseSizeBytes = JSON.stringify(fullResult).length;
        const sizeLimitMB = 1;
        const sizeLimit = sizeLimitMB * 1024 * 1024; // 1MB limit
        
        if (responseSizeBytes > sizeLimit) {
          // Large response: save to file and return summary with file path
          const filePath = saveResponseToFile(fullResult);
          
          const summary: any = {
            status: response.status,
            statusText: response.statusText,
            filePath: filePath,
            responseSize: responseSizeBytes,
            message: `Large response (${Math.round(responseSizeBytes / 1024 / 1024 * 100) / 100}MB) saved to ${filePath}`
          };

          // Add summary information about the data
          if (Array.isArray(response.data)) {
            summary.dataType = "array";
            summary.itemCount = response.data.length;
          } else if (response.data && typeof response.data === 'object') {
            summary.dataType = "object";
            summary.fieldCount = Object.keys(response.data).length;
          } else {
            summary.dataType = typeof response.data;
            summary.value = response.data;
          }

          // Add resource URL to summary if available
          if (resourceUrl) {
            summary.resourceUrl = resourceUrl;
            summary.creationMessage = `Resource created successfully. You can access it at: ${resourceUrl}`;
          }

          // Add guidance for next steps
          if (!selectors || selectors.length === 0) {
            summary.nextSteps = "Use 'selectors' parameter to extract specific values from the response data";
          }

          return JSON.stringify(summary, null, 2);
        } else {
          // Small response: return full response directly in stdout
          return JSON.stringify(fullResult, null, 2);
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorResult = {
            error: true,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data,
          };
          return JSON.stringify(errorResult, null, 2);
        }

        throw new McpError(
          ErrorCode.InternalError,
          `API call failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
}