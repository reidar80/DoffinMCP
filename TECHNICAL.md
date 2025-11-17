# Technical Documentation

## API Integration

### Doffin API Structure

The Doffin MCP server integrates with the Doffin Public API to search for procurement notices. The API endpoint structure is:

```
https://dof-notices-prod-api.developer.azure-api.net/public/v1/notices/search
```

### Request Headers

- `Ocp-Apim-Subscription-Key`: Your API subscription key
- `Accept`: `application/json`

### Query Parameters

- `query` (optional): Free-text search query
- `page`: Page number (1-indexed)
- `pageSize`: Number of results per page (max 100)

### Response Structure

The API returns a JSON response with the following structure (simplified):

```json
{
  "notices": [
    {
      "noticeId": "string",
      "title": "string",
      "publishedDate": "ISO 8601 date string",
      "deadline": "ISO 8601 date string",
      "buyerName": "string",
      "description": "string",
      "cpvCodes": ["string"]
    }
  ],
  "totalCount": number,
  "page": number,
  "pageSize": number
}
```

**Note**: The actual API response structure may include additional fields. This implementation uses a simplified interface that captures the most relevant information for RFP searches.

## Error Handling

The server implements comprehensive error handling:

1. **Missing API Key**: Returns a user-friendly error message with instructions on obtaining an API key
2. **API Errors**: Returns the HTTP status code and error message from the API
3. **Invalid Parameters**: Uses Zod schema validation to ensure parameters are valid
4. **Network Errors**: Catches and reports connection errors

## Development

### Testing Without API Key

You can test that the server starts and responds to tools/list without an API key:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js
```

This will return the list of available tools.

### Testing With MCP Inspector

The MCP Inspector is a useful tool for testing MCP servers:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

This opens a web interface where you can:
- View available tools
- Test tool invocations
- See request/response logs

### API Response Variations

Different versions of the Doffin API may return slightly different response structures. The current implementation is designed to be robust by:

1. Using optional chaining for accessing nested properties
2. Providing default values for missing fields
3. Gracefully handling variations in the data structure

If the API structure changes, update the `DoffinNotice` and `DoffinSearchResponse` interfaces in `src/index.ts`.

## MCP Protocol

This server implements the Model Context Protocol (MCP) version 1.0. It communicates via stdio and supports:

- **tools/list**: Returns the list of available tools
- **tools/call**: Executes a tool with the given parameters

### Message Format

All messages follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_rfp",
    "arguments": {
      "query": "IT services"
    }
  }
}
```

## Future Enhancements

Possible future improvements:

1. **Caching**: Implement response caching to reduce API calls
2. **Advanced Filters**: Add filters for:
   - Date ranges (publication date, deadline)
   - Buyer/organization
   - CPV codes
   - Notice type
3. **Notice Details**: Add a tool to fetch full details of a specific notice
4. **Monitoring**: Add usage statistics and monitoring
5. **Testing**: Add unit and integration tests

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control. Always use environment variables or secure secret management.
2. **Rate Limiting**: The Doffin API may have rate limits. Consider implementing client-side rate limiting if needed.
3. **Input Validation**: All user inputs are validated using Zod schemas before being sent to the API.
4. **Error Messages**: Error messages are sanitized to avoid leaking sensitive information.

## Performance

- **Response Time**: Typical API response times are 200-1000ms depending on query complexity
- **Pagination**: Use pagination for large result sets to improve performance
- **Timeouts**: The current implementation relies on Node.js default timeouts. Consider adding custom timeout handling for production use.

## Support

For technical questions:
- MCP Protocol: https://modelcontextprotocol.io/
- Doffin API: https://dof-notices-prod-api.developer.azure-api.net/
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
