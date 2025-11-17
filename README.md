# Doffin MCP Server

A Model Context Protocol (MCP) server that provides access to the Norwegian Doffin Public Procurement API. This server enables AI assistants like Claude to search and retrieve information about Norwegian public procurement notices.

## Overview

The Doffin API provides access to Norwegian public procurement data, including tender notices, contract awards, and procurement documentation. This MCP server makes that data available through a standardized interface.

## Features

- 🔍 **Search procurement notices** with advanced filtering options
- 📊 **Support for estimated value ranges** to find contracts by size
- 🏷️ **Filter by CPV codes, locations, and notice types**
- 📅 **Date range filtering** for issue and publication dates
- 🔐 **Secure API key authentication**
- 🚀 **Built with TypeScript** for type safety and better developer experience

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Doffin API Key** (required for API access)

## Getting an API Key

The Doffin API requires authentication via an API subscription key. To get your key:

1. Visit the [Doffin API Portal](https://betaapi.doffin.no) (or contact Doffin support for access)
2. Register for an API subscription
3. Obtain your `Ocp-Apim-Subscription-Key`
4. Set it as an environment variable (see Configuration below)

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

3. Set your API key as an environment variable:
```bash
export DOFFIN_API_KEY="your-api-key-here"
```

4. Build the project (optional):
```bash
npm run build
```

## Usage

### Running the Server

To start the MCP server:

```bash
export DOFFIN_API_KEY="your-api-key-here"
npm start
```

For development with auto-reload:

```bash
export DOFFIN_API_KEY="your-api-key-here"
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
      ],
      "env": {
        "DOFFIN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important:** Replace:
- `/absolute/path/to/DoffinMCP` with the actual path to your project directory
- `your-api-key-here` with your actual Doffin API subscription key

After updating the configuration, restart Claude Desktop.

## Available Tools

### 1. search_notices

Search Norwegian public procurement notices with various filters. **This is the primary and fully-supported tool.**

**Parameters:**
- `searchString` (string, optional): Free text search across notice titles and descriptions
- `numHitsPerPage` (number, optional): Results per page (default: 20)
- `page` (number, optional): Page number, 0-indexed (default: 0)
- `sortBy` (string, optional): Sort order - `PUBLICATION_DATE_ASC` or `PUBLICATION_DATE_DESC` (default)
- `type` (string, optional): Notice type filter (e.g., `"COMPETITION"` or `"COMPETITION,RESULT"` for multiple)
- `status` (string, optional): Status filter - `ACTIVE`, `EXPIRED`, `AWARDED` (comma-separated for multiple)
- `cpvCode` (string, optional): CPV classification codes (comma-separated for multiple)
- `location` (string, optional): Location ID filter (comma-separated for multiple, use `"anyw"` for non-location-specific)
- `issueDateFrom` (string, optional): Start date for issue date range (format: YYYY-MM-DD)
- `issueDateTo` (string, optional): End date for issue date range (format: YYYY-MM-DD)
- `estimatedValueFrom` (number, optional): Minimum estimated value
- `estimatedValueTo` (number, optional): Maximum estimated value

**Example:**
```
Search for active procurement notices about "construction" with estimated value between 1000000 and 10000000
```

**Response includes:**
- Notice ID, heading, and type
- Status, issue date, publication date, deadline
- Buyer information
- Location details
- Estimated value and currency
- CPV codes
- Number of received tenders
- Description preview
- Lots information (if applicable)
- Link to Doffin Classic URL

### 2. get_notice_details [EXPERIMENTAL]

Get detailed information about a specific procurement notice.

**Note:** This endpoint is not documented in the official Doffin API and may not be available. It's included for potential future use.

**Parameters:**
- `noticeId` (string, required): The unique identifier of the notice

### 3. get_notice_documents [EXPERIMENTAL]

Get a list of all documents attached to a procurement notice.

**Note:** This endpoint is not documented in the official Doffin API and may not be available.

**Parameters:**
- `noticeId` (string, required): The unique identifier of the notice

### 4. get_cpv_codes [EXPERIMENTAL]

Search CPV (Common Procurement Vocabulary) classification codes.

**Note:** This endpoint is not documented in the official Doffin API and may not be available.

**Parameters:**
- `query` (string, optional): Search term for CPV codes

### 5. get_reference_data [EXPERIMENTAL]

Get reference data for notice types, procedure types, or contract types.

**Note:** This endpoint is not documented in the official Doffin API and may not be available.

**Parameters:**
- `type` (string, required): One of `notice-types`, `procedure-types`, or `contract-types`

## API Information

**Base URL:** `https://betaapi.doffin.no/public/v2`

**Authentication:** Required via `Ocp-Apim-Subscription-Key` header

**Documented Endpoints:**
- `GET /search` - Search procurement notices (fully supported)

**Rate Limiting:** Follow reasonable usage patterns. Check with Doffin for specific rate limits.

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
- **Authentication errors**: Clear messages when API key is missing or invalid (401/403)
- **HTTP error handling**: 400, 404, 500 errors are caught and reported clearly
- **Network errors**: Connection issues are logged and reported
- **Detailed logging**: All operations are logged to stderr for debugging

## Logging

The server logs all operations to stderr in JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Making request to: https://betaapi.doffin.no/public/v2/search?status=ACTIVE",
  "data": {...}
}
```

**Log Levels:**
- `INFO` - Normal operations
- `WARN` - Warnings (e.g., missing API key, experimental endpoints)
- `ERROR` - Errors and failures
- `DEBUG` - Detailed debugging information

## Troubleshooting

### Authentication errors (401/403)

- Verify your API key is correct
- Check that `DOFFIN_API_KEY` environment variable is set
- Ensure your API subscription is active
- Contact Doffin support if issues persist

### Server won't start

1. Ensure Node.js 18+ is installed: `node --version`
2. Check that all dependencies are installed: `npm install`
3. Verify the TypeScript files are valid: `npm run build`
4. Set the API key environment variable

### Claude Desktop not connecting

1. Verify the config file path is correct for your OS
2. Ensure the absolute path in the config points to `src/index.ts`
3. Check that the `DOFFIN_API_KEY` is set in the `env` section
4. Restart Claude Desktop after configuration changes
5. Check Claude Desktop logs for error messages

### API requests failing

1. Check your internet connection
2. Verify the Doffin API is accessible
3. Check that your API key is valid and not expired
4. Review server logs (stderr) for detailed error messages
5. Verify parameter formats (dates as YYYY-MM-DD, numbers as integers)

### No results from searches

- Try broadening your search criteria
- Check that date ranges are valid (YYYY-MM-DD format)
- Verify CPV codes are correct
- Try searching without filters first
- Check estimated value ranges are reasonable

## Examples

Here are some example queries you can make through Claude:

1. **Find active construction contracts:**
   ```
   Search for active procurement notices with "construction" in the title
   ```

2. **Find high-value contracts:**
   ```
   Search for notices with estimated value between 5000000 and 50000000
   ```

3. **Filter by date range:**
   ```
   Find procurement notices issued in the last 30 days
   ```

4. **Search by location and type:**
   ```
   Search for ACTIVE notices in Oslo with type COMPETITION
   ```

5. **Filter by CPV code:**
   ```
   Find notices with CPV code 45000000 (construction work)
   ```

## API Example

Direct API call example using curl:

```bash
curl -X 'GET' \
  'https://betaapi.doffin.no/public/v2/search?numHitsPerPage=2&page=0&status=ACTIVE' \
  -H 'Ocp-Apim-Subscription-Key: your-api-key-here' \
  -H 'Accept: application/json'
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details

## Resources

- [Doffin Official Website](https://doffin.no/)
- [Doffin Beta API](https://betaapi.doffin.no)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Support

For issues related to:
- **This MCP server**: Open an issue in this repository
- **Doffin API access/keys**: Contact Doffin support
- **MCP protocol**: See MCP documentation
- **Claude Desktop**: Contact Anthropic support

## Changelog

### Version 2.0.0
- Updated to use actual Doffin Beta API (betaapi.doffin.no/public/v2)
- Added API key authentication support
- Updated parameter names to match official API documentation
- Added support for estimated value range filtering
- Added support for multiple filters (types, statuses, CPV codes, locations)
- Marked undocumented endpoints as experimental
- Improved error handling and logging
- Updated response formatting to include all available fields

### Version 1.0.0
- Initial release with assumed API structure
