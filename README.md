# Metabase MCP Server

A comprehensive Model Context Protocol (MCP) server that provides seamless integration between Claude and Metabase. This server enables AI assistants to interact with Metabase APIs, browse resources, and execute analytics operations through natural language.

## Overview

The Metabase MCP Server bridges the gap between conversational AI and business intelligence by providing:

- **Complete API Access**: Full integration with Metabase's REST API (355+ endpoints)
- **Resource Discovery**: Browse dashboards, questions, and databases as MCP resources
- **Intelligent API Exploration**: Search and discover API endpoints with detailed documentation
- **Secure Authentication**: Environment-based configuration with API key support
- **Production Ready**: Built with TypeScript, comprehensive error handling, and security best practices

## Quick Start

### Installation

Install via yarn:

```bash
yarn global add metabase-mcp
```

Or use with npx:

```bash
npx -y metabase-mcp
```

### Configuration

The server requires environment variables to authenticate with your Metabase instance. These should be configured in your Claude Desktop MCP settings (see Claude Desktop Integration section above) or in a `.env` file if running standalone.

**Required Environment Variables:**

```env
# Your Metabase instance URL
METABASE_URL=https://your-metabase-instance.com

# Your Metabase API key (generate from Admin > People > API Keys)
METABASE_API_KEY=mb_your_api_key_here
```

**Optional Authentication Alternatives:**

```env
METABASE_SESSION_TOKEN=your_session_token
# OR
METABASE_USERNAME=your_username
METABASE_PASSWORD=your_password
```

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "metabase": {
      "command": "npx",
      "args": ["-y", "metabase-mcp"],
      "env": {
        "METABASE_URL": "https://your-metabase-instance.com",
        "METABASE_API_KEY": "mb_your_api_key_here"
      }
    }
  }
}
```

**Note:** The server requires environment variables to function. You must provide at minimum `METABASE_URL` and either `METABASE_API_KEY` or alternative authentication credentials in the `env` section.

## Features

### 🎯 Core Capabilities

- **API Discovery**: Explore 355+ Metabase API endpoints across 56 categories
- **Resource Browsing**: Access dashboards, questions, and databases as MCP resources
- **Direct API Execution**: Make authenticated calls to any Metabase endpoint
- **Advanced Response Processing**: Intelligent data selection with schema generation
- **Resource URL Generation**: Automatic links to created dashboards and questions

### 🔧 Available Tools

#### 1. `api_call` - Execute Metabase API Calls

Execute authenticated API calls to your Metabase instance with advanced response processing.

**Key Features:**

- Automatic authentication using environment variables
- Path parameter substitution
- Query parameter handling
- Request body support for POST/PUT operations
- Schema generation for complex responses
- Data selection with path selectors
- Automatic resource URL generation for created items

**Example Usage:**

```json
{
  "name": "api_call",
  "arguments": {
    "path": "/api/dashboard",
    "method": "GET",
    "queryParams": {
      "f": "all"
    }
  }
}
```

**Advanced Data Selection:**

```json
{
  "name": "api_call",
  "arguments": {
    "path": "/api/card",
    "method": "GET",
    "selectors": ["root[0:10].name", "root[*].id", "root[5].collection.name"]
  }
}
```

#### 2. `list_api_spec` - Browse Available Endpoints

Discover available Metabase API endpoints with filtering and pagination.

```json
{
  "name": "list_api_spec",
  "arguments": {
    "category": "dashboard",
    "method": "GET",
    "page": 1,
    "limit": 20
  }
}
```

#### 3. `get_api_spec` - Get Endpoint Documentation

Retrieve detailed documentation for specific API endpoints.

```json
{
  "name": "get_api_spec",
  "arguments": {
    "path": "/api/dashboard/{id}",
    "method": "GET"
  }
}
```

#### 4. `search_api_spec` - Search API Documentation

Search through API endpoints by category, method, or keywords.

```json
{
  "name": "search_api_spec",
  "arguments": {
    "search": "query execution",
    "category": "card",
    "limit": 10
  }
}
```

### 📊 MCP Resources

Access Metabase resources directly through the MCP resource system:

- **Dashboards**: `metabase://dashboard/{id}`
- **Questions/Cards**: `metabase://card/{id}`
- **Databases**: `metabase://database/{id}`

Resources are automatically discovered and cached for efficient browsing.

### 🔍 Advanced Response Processing

The server provides intelligent response processing with:

**Schema Generation**: Automatic schema generation for complex API responses

```json
{
  "type": "array",
  "count": 25,
  "itemSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "number" },
      "name": { "type": "string" }
    }
  }
}
```

**Path Selectors**: Extract specific data using path notation

- `root[*].name` - Get all names from array items
- `root[0:10].id` - Get IDs from first 10 items
- `root[5].collection.name` - Get nested field from specific item

**Resource URLs**: Automatic URL generation for created resources

```json
{
  "resourceUrl": "https://metabase.company.com/dashboard/123",
  "message": "Resource created successfully. You can access it at: https://metabase.company.com/dashboard/123"
}
```

## Use Cases

### Analytics Automation

```json
{
  "name": "api_call",
  "arguments": {
    "path": "/api/card/{card-id}/query",
    "method": "POST",
    "pathParams": { "card-id": 42 }
  }
}
```

### Dashboard Management

```json
{
  "name": "api_call",
  "arguments": {
    "path": "/api/dashboard",
    "method": "POST",
    "body": {
      "name": "Weekly Analytics",
      "description": "Automated weekly dashboard"
    }
  }
}
```

### Data Discovery

```json
{
  "name": "api_call",
  "arguments": {
    "path": "/api/database/{db-id}/schema",
    "method": "GET",
    "pathParams": { "db-id": 1 }
  }
}
```

## Authentication

### API Key Authentication (Recommended)

Generate an API key from your Metabase instance:

1. Log in as an admin
2. Navigate to **Admin > People > API Keys**
3. Click **Create API Key**
4. Copy the generated key (starts with `mb_`)
5. Add to your `.env` file

### Environment Variables

```env
# Required
METABASE_URL=https://your-metabase-instance.com
METABASE_API_KEY=mb_your_api_key_here

# Optional authentication alternatives
METABASE_SESSION_TOKEN=your_session_token
METABASE_USERNAME=your_username
METABASE_PASSWORD=your_password
```

## API Coverage

The server provides access to all major Metabase API categories:

- **Core Data**: Cards, Dashboards, Databases, Datasets
- **User Management**: Users, Permissions, Sessions
- **Data Management**: Collections, Tables, Fields
- **Analytics**: Queries, Metrics, Segments
- **Administration**: Setup, Utils, System

## Requirements

- **Node.js**: 18+
- **Metabase**: Any version with API access
- **Credentials**: Valid API key or session token

## Troubleshooting

### Common Issues

**Authentication Errors**

- Verify your API key is correct and starts with `mb_`
- Ensure your Metabase URL is accessible
- Check that your API key has sufficient permissions

**Connection Issues**

- Verify the METABASE_URL is correct and accessible
- Check network connectivity to your Metabase instance
- Ensure no firewall blocking the connection

**Resource Loading Failures**

- Resources may take time to load on first connection
- Check Metabase permissions for the API key user
- Verify the API key can access the requested resources

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=metabase-mcp yarn start
```

## Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Setting up your development environment
- Project structure and architecture
- Security best practices for contributors
- Code style and standards
- Submitting pull requests

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- GitHub Issues: Report bugs and feature requests
- Documentation: Complete API reference available at your Metabase instance `/api/docs`

---

Built with ❤️ for the Claude ecosystem
