#!/usr/bin/env node

import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  OpenAPISpec,
  ToolHandler,
} from "./types.js";
import { createListApiSpecTool } from "./tools/list_api_spec.js";
import { createGetApiSpecTool } from "./tools/get_api_spec.js";
import { createSearchApiSpecTool } from "./tools/search_api_spec.js";
import { createApiCallTool } from "./tools/api_call.js";
import { ResourceManager } from "./resources/manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class MetabaseMCPServer {
  private server: Server;
  private openApiSpec: OpenAPISpec;
  private tools: Map<string, ToolHandler> = new Map();
  private resourceManager: ResourceManager;

  constructor() {
    // Load environment variables
    config();
    this.server = new Server(
      {
        name: "metabase-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Load OpenAPI specification
    try {
      const specPath = resolve(__dirname, "../metabase-api-documentation.json");
      const specContent = readFileSync(specPath, "utf-8");
      this.openApiSpec = JSON.parse(specContent);
    } catch (error) {
      console.error("Failed to load OpenAPI specification:", error);
      throw error;
    }

    this.resourceManager = new ResourceManager();
    this.initializeTools();
    this.setupHandlers();
    
    // Initialize resources on startup
    this.initializeResources();
  }

  private initializeTools(): void {
    // Initialize all tools
    const listApiSpec = createListApiSpecTool(this.openApiSpec);
    const getApiSpec = createGetApiSpecTool(this.openApiSpec);
    const searchApiSpec = createSearchApiSpecTool(this.openApiSpec);
    const apiCall = createApiCallTool();

    // Store tools in map for easy access
    this.tools.set(listApiSpec.definition.name, listApiSpec);
    this.tools.set(getApiSpec.definition.name, getApiSpec);
    this.tools.set(searchApiSpec.definition.name, searchApiSpec);
    this.tools.set(apiCall.definition.name, apiCall);
  }

  private setupHandlers(): void {
    // Set up tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => tool.definition),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const tool = this.tools.get(name);
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        const result = await tool.handler(args || {});
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Set up resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const resources = await this.resourceManager.listResources();
        return { resources };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error listing resources: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        const contents = await this.resourceManager.readResource(uri);
        return { contents: [contents] };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error reading resource: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async initializeResources(): Promise<void> {
    try {
      await this.resourceManager.initialize();
    } catch (error) {
      console.error("Failed to initialize resources:", error);
      // Don't throw - server should still start even if resources fail to load initially
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Metabase MCP Server running on stdio");
  }
}

// Start the server
const server = new MetabaseMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});