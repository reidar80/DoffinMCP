# DoffinMCP

An MCP (Model Context Protocol) server for searching Doffin, Norway's official public procurement database, for RFP (Request for Proposal) publications.

## Overview

This server enables AI assistants to search and retrieve information about public procurement opportunities in Norway through the Doffin API. It provides access to tender notices, RFPs, and other procurement-related publications.

## Features

- **Search** Doffin procurement notices with advanced filters
- **Download** complete notice documents in JSON format
- **List** and download all attached documents for a notice
- Retrieve detailed information about RFPs including:
  - Notice ID and title
  - Publication and deadline dates
  - Buyer/contracting authority information
  - Descriptions and CPV codes
  - Estimated values and locations
  - Document attachments
- **Advanced filtering** by type, status, CPV codes, locations, dates, and values
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

### search_notices

Search Norwegian public procurement notices with advanced filters. This is the primary tool for finding procurement opportunities.

**Parameters:**
- `searchString` (optional, string): Free text search across notice titles and descriptions
- `numHitsPerPage` (optional, number): Number of results per page (default: 20)
- `page` (optional, number): Page number, 0-indexed (default: 0)
- `sortBy` (optional, string): Sort order - `PUBLICATION_DATE_ASC` or `PUBLICATION_DATE_DESC` (default)
- `type` (optional, string): Notice type filter (e.g., "COMPETITION,RESULT" for multiple)
- `status` (optional, string): Status filter - `ACTIVE`, `EXPIRED`, `AWARDED`
- `cpvCode` (optional, string): CPV classification codes (comma-separated for multiple)
- `location` (optional, string): Location ID filter (use "anyw" for non-location-specific)
- `issueDateFrom` (optional, string): Start date in YYYY-MM-DD format
- `issueDateTo` (optional, string): End date in YYYY-MM-DD format
- `estimatedValueFrom` (optional, number): Minimum estimated value
- `estimatedValueTo` (optional, number): Maximum estimated value

**Example:**
```
Search for IT services: searchString="IT services"
Active tenders only: status="ACTIVE"
Specific location: location="03"
```

### download_notice

Download the complete notice document for a specific Doffin ID. Returns the full notice data including all details and metadata in JSON format.

**Parameters:**
- `doffinId` (required, string): The Doffin ID of the notice (e.g., "2023-100282")

**Example:**
```
Download notice: doffinId="2023-100282"
```

### get_notice_documents

**[EXPERIMENTAL]** Get a list of all documents attached to a procurement notice.

Note: This endpoint is not documented in the official API and may not work for all notices.

**Parameters:**
- `noticeId` (required, string): The unique identifier of the notice

**Returns:**
- List of documents with name, type, URL, size, and upload date

### download_all_documents

**[EXPERIMENTAL]** Download all documents attached to a procurement notice. This tool fetches the list of documents and downloads each one.

Note: This uses an undocumented endpoint and may not work for all notices.

**Parameters:**
- `noticeId` (required, string): The unique identifier of the notice
- `includeContent` (optional, boolean): Whether to include actual file content in the response (default: false). If true, files will be base64 encoded.

**Returns:**
- Summary of all documents with download status
- If `includeContent` is true, includes base64-encoded file content

**Example:**
```
List documents only: noticeId="2023-100282", includeContent=false
Download all content: noticeId="2023-100282", includeContent=true
```

### get_notice_details

**[EXPERIMENTAL]** Get detailed information about a specific procurement notice.

Note: This endpoint is not documented in the official API and may not work.

**Parameters:**
- `noticeId` (required, string): The unique identifier of the notice

### get_cpv_codes

**[EXPERIMENTAL]** Search CPV (Common Procurement Vocabulary) classification codes.

Note: This endpoint is not documented in the official API and may not work.

**Parameters:**
- `query` (optional, string): Search term to find relevant CPV codes

### get_reference_data

**[EXPERIMENTAL]** Get reference data such as notice types, procedure types, and contract types.

Note: This endpoint is not documented in the official API and may not work.

**Parameters:**
- `type` (required, string): The type of reference data - `notice-types`, `procedure-types`, or `contract-types`

## Example Usage in Claude

Once configured, you can ask Claude questions like:

**Searching:**
- "Search Doffin for IT consulting RFPs"
- "Find recent procurement opportunities for construction projects"
- "What are the latest active RFPs in healthcare?"
- "Show me page 2 of software development tenders"
- "Find tenders with estimated value over 1 million NOK"

**Downloading:**
- "Download the complete notice for Doffin ID 2023-100282"
- "Get all documents attached to notice 2023-100282"
- "Download all documents for this RFP with their content"

**Analyzing:**
- "What CPV codes are used for IT services?"
- "Show me details for notice 2023-100282"

## Development

### Project Structure

```
DoffinMCP/
├── src/
│   ├── index.ts        # Main server implementation
│   └── types.ts        # TypeScript type definitions
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

This server uses the Doffin Public API v2 (`https://betaapi.doffin.no/public/v2`). For more information:
- [Doffin API Documentation](https://dof-notices-prod-api.developer.azure-api.net/)
- [Doffin Website](https://www.doffin.no/)
- [Beta API Endpoint](https://betaapi.doffin.no/public/v2/)

**Note:** Some tools are marked as EXPERIMENTAL because they use undocumented API endpoints. These may not work for all notices or could change without notice.

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

