import axios from "axios";
import {
  Resource,
  ResourceContents,
  MetabaseCard,
  MetabaseDashboard,
  MetabaseDatabase,
  MetabaseConfig,
} from "../types.js";

export class ResourceManager {
  private config: MetabaseConfig;
  private cachedResources: Resource[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = {
      baseUrl: process.env.METABASE_URL,
      apiKey: process.env.METABASE_API_KEY,
      sessionToken: process.env.METABASE_SESSION_TOKEN,
      username: process.env.METABASE_USERNAME,
      password: process.env.METABASE_PASSWORD,
    };
  }

  async initialize(): Promise<void> {
    await this.fetchAndCacheResources();
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-KEY"] = this.config.apiKey;
    } else if (this.config.sessionToken) {
      headers["X-Metabase-Session"] = this.config.sessionToken;
    }

    return headers;
  }

  private async makeRequest(path: string): Promise<any> {
    if (!this.config.baseUrl) {
      throw new Error("METABASE_URL environment variable is required");
    }

    const headers = await this.getAuthHeaders();
    const url = `${this.config.baseUrl}${path}`;

    const response = await axios.get(url, { headers });
    return response.data;
  }

  private async fetchAndCacheResources(): Promise<void> {
    const now = Date.now();
    if (this.cachedResources.length > 0 && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return; // Use cached resources
    }

    const resources: Resource[] = [];

    try {
      // Get cards using correct API endpoint with default filter
      const cards = await this.makeRequest("/api/card?f=all");
      if (Array.isArray(cards)) {
        cards.forEach((card: MetabaseCard) => {
          resources.push({
            uri: `metabase://card/${card.id}`,
            name: card.name,
            description: `Metabase card: ${card.description || card.name}`,
            mimeType: "application/json",
          });
        });
      }

      // Get dashboards using correct API endpoint with default filter
      const dashboards = await this.makeRequest("/api/dashboard?f=all");
      if (Array.isArray(dashboards)) {
        dashboards.forEach((dashboard: MetabaseDashboard) => {
          resources.push({
            uri: `metabase://dashboard/${dashboard.id}`,
            name: dashboard.name,
            description: `Metabase dashboard: ${dashboard.description || dashboard.name}`,
            mimeType: "application/json",
          });
        });
      }

      // Get databases using correct API endpoint
      const databasesResponse = await this.makeRequest("/api/database");
      const databases = Array.isArray(databasesResponse) ? databasesResponse : databasesResponse?.data;
      if (Array.isArray(databases)) {
        databases.forEach((database: MetabaseDatabase) => {
          resources.push({
            uri: `metabase://database/${database.id}`,
            name: database.name,
            description: `Metabase database: ${database.description || database.name}`,
            mimeType: "application/json",
          });
        });
      }

      this.cachedResources = resources;
      this.lastFetchTime = now;
      console.error(`Fetched ${resources.length} Metabase resources`);
    } catch (error) {
      console.error("Error fetching resources:", error);
      // Keep existing cached resources on error
    }
  }

  async listResources(): Promise<Resource[]> {
    await this.fetchAndCacheResources();
    return this.cachedResources;
  }

  async refreshResources(): Promise<void> {
    this.lastFetchTime = 0; // Force refresh
    await this.fetchAndCacheResources();
  }

  async readResource(uri: string): Promise<ResourceContents> {
    const [protocol, resourceType, id] = uri.split(/[:\/]+/);
    
    if (protocol !== "metabase") {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }

    try {
      let data: any;
      let resourceName: string;

      switch (resourceType) {
        case "card":
          data = await this.makeRequest(`/api/card/${id}`);
          resourceName = `Metabase Card: ${data.name}`;
          break;
        case "dashboard":
          data = await this.makeRequest(`/api/dashboard/${id}`);
          resourceName = `Metabase Dashboard: ${data.name}`;
          break;
        case "database":
          data = await this.makeRequest(`/api/database/${id}`);
          resourceName = `Metabase Database: ${data.name}`;
          break;
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          type: resourceType,
          name: resourceName,
          data: data,
        }, null, 2),
      };
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}