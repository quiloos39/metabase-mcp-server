# Contributing to Metabase MCP Server

Thank you for your interest in contributing to the Metabase MCP Server! This guide provides information for developers and contributors.

## Development Setup

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd metabase-mcp

# Install dependencies
yarn install

# Build the project
yarn build

# Run in development mode
yarn dev
```

### Project Structure

```
src/
├── index.ts              # Main MCP server
├── types.ts              # TypeScript type definitions
├── resources/
│   └── manager.ts        # MCP resource management
└── tools/
    ├── api_call.ts       # Direct API execution
    ├── list_api_spec.ts  # API endpoint listing
    ├── get_api_spec.ts   # Endpoint documentation
    └── search_api_spec.ts # API search functionality
```

### Build and Testing

```bash
# Compile TypeScript to JavaScript
yarn build

# Watch mode for development
yarn dev

# Test the server locally
yarn start
```

## Security Guidelines

This package is designed for secure npm distribution:

- ✅ **Environment Variables**: All sensitive data (API keys, credentials) must be stored in environment variables
- ✅ **No Hardcoded Secrets**: Never commit API keys, tokens, or passwords to the repository
- ✅ **`.npmignore` Configuration**: Comprehensive exclusion of sensitive files from npm package
- ✅ **Source Code Exclusion**: Only compiled distribution code is included in the npm package
- ✅ **Clean Distribution**: The `dist/` directory contains only the necessary compiled code

### Before Publishing

1. Ensure `.env` and `.env.example` are in `.gitignore`
2. Verify `.npmignore` includes:
   - Source files (`src/`)
   - Environment files (`.env`, `.env.*`)
   - Development files (`tsconfig.json`, etc.)
   - Git files (`.git`, `.gitignore`)
3. Review compiled output in `dist/` for any sensitive data
4. Test the package locally with `npm pack` before publishing

### Security Checklist

- [ ] No API keys or credentials in source code
- [ ] All sensitive configuration in environment variables
- [ ] `.npmignore` properly configured
- [ ] Source code excluded from npm package
- [ ] Test package contents with `npm pack`
- [ ] Documentation doesn't include real credentials

## Code Style and Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide proper type definitions for all functions
- Avoid `any` types where possible
- Document complex types with JSDoc comments

### Error Handling

- All API calls should have proper error handling
- Provide meaningful error messages to users
- Log errors appropriately for debugging

### Testing

- Test all new features locally before committing
- Verify MCP integration with Claude Desktop
- Test authentication with different credential types
- Validate API response processing

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the guidelines above
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Publishing Workflow

For maintainers publishing to npm:

```bash
# 1. Update version in package.json
yarn version --patch|--minor|--major

# 2. Build the project
yarn build

# 3. Test the package locally
yarn pack
# Extract and inspect the .tgz file

# 4. Publish to npm
yarn publish

# 5. Push changes and tags
git push && git push --tags
```

## Questions?

If you have questions about contributing, please open an issue or reach out to the maintainers.

---

Thank you for contributing to the Metabase MCP Server!
