import { ToolHandler, OpenAPISpec, APIEndpoint, ListAPIArgs } from "../types.js";

export function createSearchApiSpecTool(openApiSpec: OpenAPISpec): ToolHandler {
  return {
    definition: {
      name: "search_api_spec",
      description: "Search and filter API endpoints in the specification. This tool works with the API documentation, not actual API calls.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter endpoints by category (e.g., 'card', 'dashboard', 'database')",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "Filter endpoints by HTTP method",
          },
          search: {
            type: "string",
            description: "Search for endpoints containing this text in path, summary, or description",
          },
          page: {
            type: "number",
            description: "Page number for pagination (1-based, default: 1)",
            minimum: 1,
          },
          limit: {
            type: "number", 
            description: "Number of results per page (default: 50, max: 500)",
            minimum: 1,
            maximum: 500,
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (args: ListAPIArgs): Promise<string> => {
      const { category, method, search, page = 1, limit = 50 } = args;
      const endpoints: APIEndpoint[] = [];

      // Extract all endpoints from OpenAPI spec
      for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
        for (const [httpMethod, operation] of Object.entries(pathItem)) {
          if (!["get", "post", "put", "delete", "patch"].includes(httpMethod.toLowerCase())) {
            continue;
          }

          const endpoint: APIEndpoint = {
            path,
            method: httpMethod.toUpperCase(),
            summary: operation.summary,
            description: operation.description,
            operationId: operation.operationId,
          };

          // Apply filters
          if (category && !path.toLowerCase().includes(`/api/${category.toLowerCase()}/`)) {
            continue;
          }

          if (method && endpoint.method !== method.toUpperCase()) {
            continue;
          }

          if (search) {
            const searchLower = search.toLowerCase();
            const searchableText = [
              endpoint.path,
              endpoint.summary || "",
              endpoint.description || "",
            ].join(" ").toLowerCase();
            
            if (!searchableText.includes(searchLower)) {
              continue;
            }
          }

          endpoints.push(endpoint);
        }
      }

      // Sort endpoints by path and method
      endpoints.sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;
        return a.method.localeCompare(b.method);
      });

      // Calculate pagination
      const total = endpoints.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedEndpoints = endpoints.slice(offset, offset + limit);

      // Format output with pagination info
      const result = {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        endpoints: paginatedEndpoints.map(ep => ({
          path: ep.path,
          method: ep.method,
          summary: ep.summary,
          operationId: ep.operationId,
        })),
      };

      return JSON.stringify(result, null, 2);
    },
  };
}