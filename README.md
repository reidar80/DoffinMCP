# DoffinMCP

An MCP (Model Context Protocol) server for searching Doffin, Norway's official public procurement database, for RFP (Request for Proposal) publications.

## Overview

This server enables AI assistants to search and retrieve information about public procurement opportunities in Norway through the Doffin API. It provides access to tender notices, RFPs, and other procurement-related publications.

## Features

- Search Doffin procurement notices by keywords
- Retrieve detailed information about RFPs including:
  - Notice ID and title
  - Publication and deadline dates
  - Buyer/contracting authority information
  - Descriptions and CPV codes
- Pagination support for large result sets
- Error handling and validation

## Prerequisites

- Node.js 18 or higher
- A Doffin API key (see [Getting an API Key](#getting-an-api-key))

## Installation

1. Clone this repository:
```bash
git clone https://github.com/reidar80/DoffinMCP.git
cd DoffinMCP
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Getting an API Key

To use this MCP server, you need to obtain an API key from the Doffin API Management Portal:

1. Visit the [Doffin API Management Portal](https://dof-notices-prod-api.developer.azure-api.net/)
2. Sign up for an account
3. Register a subscription for the Public API
4. Copy your subscription key

## Configuration

Set the `DOFFIN_API_KEY` environment variable with your API key:

```bash
export DOFFIN_API_KEY=your_api_key_here
```

Or create a `.env` file in the project root:
```
DOFFIN_API_KEY=your_api_key_here
```

## Usage

### With Claude Desktop

Add this server to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "doffin": {
      "command": "node",
      "args": ["/path/to/DoffinMCP/build/index.js"],
      "env": {
        "DOFFIN_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### With Other MCP Clients

Run the server directly:
```bash
DOFFIN_API_KEY=your_api_key_here node build/index.js
```

The server communicates via stdio following the MCP protocol.

## Available Tools

### search_rfp

Search Doffin for RFP publications and procurement notices.

**Parameters:**
- `query` (optional, string): Search query text to filter notices
- `page` (optional, number): Page number for pagination (default: 1)
- `pageSize` (optional, number): Number of results per page, max 100 (default: 20)

**Example queries:**
- "IT services"
- "construction project"
- "healthcare equipment"
- "consulting services"

## Example Usage in Claude

Once configured, you can ask Claude questions like:

- "Search Doffin for IT consulting RFPs"
- "Find recent procurement opportunities for construction projects"
- "What are the latest RFPs in healthcare?"
- "Show me page 2 of software development tenders"

## Development

### Project Structure

```
DoffinMCP/
├── src/
│   └── index.ts        # Main server implementation
├── build/              # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Testing

The server can be tested using the MCP Inspector tool:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## API Reference

This server uses the Doffin Public API. For more information:
- [Doffin API Documentation](https://dof-notices-prod-api.developer.azure-api.net/)
- [Doffin Website](https://www.doffin.no/)

## About Doffin

Doffin is Norway's official database for public procurement. All public contracts must be advertised through Doffin, ensuring transparency and promoting competition. The platform is managed by the Agency for Public Management and eGovernment (DFØ).

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues with:
- This MCP server: Open an issue on GitHub
- The Doffin API: Contact DFØ through their portal
- MCP protocol: See [Model Context Protocol documentation](https://modelcontextprotocol.io/)

