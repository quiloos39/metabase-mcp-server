import { ToolHandler, OpenAPISpec, GetAPIArgs } from "../types.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export function createGetApiSpecTool(openApiSpec: OpenAPISpec): ToolHandler {
  return {
    definition: {
      name: "get_api_spec",
      description: "Get detailed information about a specific API endpoint from the specification including parameters, request body, and response schemas. This tool works with the API documentation, not actual API calls.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The API endpoint path (e.g., '/api/card/{card-id}')",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "The HTTP method for the endpoint",
          },
        },
        required: ["path", "method"],
        additionalProperties: false,
      },
    },
    handler: async (args: GetAPIArgs): Promise<string> => {
      const { path, method } = args;
      
      // Find the endpoint in the OpenAPI spec
      const pathItem = openApiSpec.paths[path];
      if (!pathItem) {
        throw new McpError(ErrorCode.InvalidParams, `API path not found: ${path}`);
      }

      const operation = pathItem[method.toLowerCase()];
      if (!operation) {
        throw new McpError(ErrorCode.InvalidParams, `Method ${method} not found for path ${path}`);
      }

      // Extract detailed information
      const apiInfo = {
        path,
        method: method.toUpperCase(),
        summary: operation.summary,
        description: operation.description,
        operationId: operation.operationId,
        parameters: operation.parameters || [],
        requestBody: operation.requestBody,
        responses: operation.responses || {},
        tags: operation.tags || [],
      };

      // Resolve schema references if needed
      if (apiInfo.requestBody?.content) {
        for (const [, content] of Object.entries(apiInfo.requestBody.content)) {
          if (content.schema?.$ref) {
            const schemaName = content.schema.$ref.replace('#/components/schemas/', '');
            if (openApiSpec.components?.schemas?.[schemaName]) {
              content.resolvedSchema = openApiSpec.components.schemas[schemaName];
            }
          }
        }
      }

      return JSON.stringify(apiInfo, null, 2);
    },
  };
}