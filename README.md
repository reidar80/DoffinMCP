# Doffin MCP Server

A Model Context Protocol (MCP) server that provides access to the Norwegian Doffin Public Procurement API. This server enables AI assistants like Claude to search and retrieve information about Norwegian public procurement notices.

## Overview

The Doffin API provides access to Norwegian public procurement data, including tender notices, contract awards, and procurement documentation. This MCP server makes that data available through a standardized interface.

## Features

- 🔍 **Search procurement notices** with advanced filtering options
- 📄 **Retrieve detailed notice information** including requirements and contact details
- 📎 **Access attached documents** for procurement notices
- 🏷️ **Search CPV classification codes** for categorizing procurements
- 📚 **Get reference data** for notice types, procedures, and contract types
- ✅ **No authentication required** - the Doffin API is publicly accessible
- 🚀 **Built with TypeScript** for type safety and better developer experience

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DoffinMCP
```

2. Install dependencies:
```bash
npm install
```

3. Build the project (optional):
```bash
npm run build
```

## Usage

### Running the Server

To start the MCP server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Integrating with Claude Desktop

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop config file:

**Location of config file:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "doffin": {
      "command": "node",
      "args": [
        "--no-warnings=ExperimentalWarning",
        "--loader",
        "tsx",
        "/absolute/path/to/DoffinMCP/src/index.ts"
      ]
    }
  }
}
```

Replace `/absolute/path/to/DoffinMCP` with the actual path to your project directory.

After updating the configuration, restart Claude Desktop.

## Available Tools

### 1. search_notices

Search Norwegian public procurement notices with various filters.

**Parameters:**
- `query` (string, optional): Free text search across notice titles and descriptions
- `status` (string, optional): Filter by status - `ACTIVE`, `EXPIRED`, or `AWARDED`
- `publishedFrom` (string, optional): Filter notices published from this date (ISO format: YYYY-MM-DD)
- `publishedTo` (string, optional): Filter notices published until this date (ISO format: YYYY-MM-DD)
- `cpvCodes` (string, optional): Comma-separated list of CPV classification codes
- `buyerName` (string, optional): Filter by buyer organization name
- `page` (number, optional): Page number for pagination (0-indexed, default: 0)
- `size` (number, optional): Number of results per page (default: 20, max: 100)

**Example:**
```
Search for active procurement notices related to "construction" published in the last 30 days
```

### 2. get_notice_details

Get detailed information about a specific procurement notice.

**Parameters:**
- `noticeId` (string, required): The unique identifier of the notice

**Returns:**
- Full notice details including description, requirements, contact information, award criteria, and additional information

**Example:**
```
Get details for notice ID "2024-123456"
```

### 3. get_notice_documents

Get a list of all documents attached to a procurement notice.

**Parameters:**
- `noticeId` (string, required): The unique identifier of the notice

**Returns:**
- List of documents with names, types, URLs, sizes, and upload dates

**Example:**
```
Get all documents for notice ID "2024-123456"
```

### 4. get_cpv_codes

Search CPV (Common Procurement Vocabulary) classification codes.

**Parameters:**
- `query` (string, optional): Search term to find relevant CPV codes

**Returns:**
- CPV codes with their descriptions

**Example:**
```
Search for CPV codes related to "IT services"
```

### 5. get_reference_data

Get reference data for notice types, procedure types, or contract types.

**Parameters:**
- `type` (string, required): Type of reference data - `notice-types`, `procedure-types`, or `contract-types`

**Returns:**
- List of reference data with codes, names, and descriptions

**Example:**
```
Get all available notice types
```

## API Information

**Base URL:** `https://api.doffin.no/doffin`

**Authentication:** None required (public API)

**Rate Limiting:** Follow reasonable usage patterns. The API is public but should not be abused.

## Development

### Project Structure

```
DoffinMCP/
├── src/
│   ├── index.ts       # Main MCP server implementation
│   └── types.ts       # TypeScript type definitions
├── dist/              # Compiled JavaScript (after build)
├── package.json       # Project dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

### Building

To compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled output will be in the `dist/` directory.

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the MCP server
- `npm run dev` - Start the server in development mode

## Error Handling

The server includes comprehensive error handling:

- **Parameter validation**: Required parameters are validated before API calls
- **HTTP error handling**: 400, 404, 500 errors are caught and reported clearly
- **Network errors**: Connection issues are logged and reported
- **Detailed logging**: All operations are logged to stderr for debugging

## Logging

The server logs all operations to stderr in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Making request to: https://api.doffin.no/doffin/notices?status=ACTIVE",
  "data": {...}
}
```

## Troubleshooting

### Server won't start

1. Ensure Node.js 18+ is installed: `node --version`
2. Check that all dependencies are installed: `npm install`
3. Verify the TypeScript files are valid: `npm run build`

### Claude Desktop not connecting

1. Verify the config file path is correct for your OS
2. Ensure the absolute path in the config points to `src/index.ts`
3. Restart Claude Desktop after configuration changes
4. Check Claude Desktop logs for error messages

### API requests failing

1. Check your internet connection
2. Verify the Doffin API is accessible: `curl https://api.doffin.no/doffin/notices`
3. Review server logs (stderr) for detailed error messages

### No results from searches

- Try broadening your search criteria
- Check that date ranges are valid (YYYY-MM-DD format)
- Verify CPV codes are correct
- Try searching without filters first

## Examples

Here are some example queries you can make through Claude:

1. **Find active construction contracts:**
   ```
   Search for active procurement notices with "construction" in the title
   ```

2. **Get detailed information:**
   ```
   Show me the full details for notice 2024-123456
   ```

3. **Find notices by organization:**
   ```
   Search for procurement notices from "Oslo Kommune"
   ```

4. **Browse by category:**
   ```
   Search for CPV codes related to "software development" and then find related notices
   ```

5. **Check deadline information:**
   ```
   Find all active notices with deadlines in the next 7 days
   ```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Resources

- [Doffin Official Website](https://doffin.no/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Support

For issues related to:
- **This MCP server**: Open an issue in this repository
- **Doffin API**: Contact Doffin support
- **MCP protocol**: See MCP documentation
- **Claude Desktop**: Contact Anthropic support
