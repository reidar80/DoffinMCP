#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Schema for search_rfp tool arguments
const SearchRfpArgsSchema = z.object({
  query: z.string().optional().describe("Search query text to filter notices"),
  page: z.number().int().positive().default(1).describe("Page number for pagination"),
  pageSize: z.number().int().positive().max(100).default(20).describe("Number of results per page (max 100)"),
});

// Interface for Doffin API response (simplified)
interface DoffinNotice {
  noticeId: string;
  title: string;
  publishedDate: string;
  deadline?: string;
  buyerName?: string;
  description?: string;
  cpvCodes?: string[];
}

interface DoffinSearchResponse {
  notices: DoffinNotice[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Searches Doffin for RFP publications
 * 
 * This uses the Doffin public API to search for procurement notices.
 * Note: In production, you would need an API key from https://dof-notices-prod-api.developer.azure-api.net/
 * 
 * @param query - Search query text
 * @param page - Page number
 * @param pageSize - Results per page
 * @returns Search results from Doffin
 */
async function searchDoffinRfp(
  query?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<DoffinSearchResponse> {
  // Get API key from environment variable
  const apiKey = process.env.DOFFIN_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "DOFFIN_API_KEY environment variable is not set. " +
      "Please obtain an API key from https://dof-notices-prod-api.developer.azure-api.net/ " +
      "and set it in your environment."
    );
  }

  // Construct the API URL
  const baseUrl = "https://dof-notices-prod-api.developer.azure-api.net/public/v1/notices/search";
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  
  if (query) {
    params.append("query", query);
  }

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Doffin API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    
    // Transform the response to our interface
    // Note: The actual API response structure may vary
    return {
      notices: data.notices || [],
      totalCount: data.totalCount || 0,
      page: page,
      pageSize: pageSize,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search Doffin: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Formats the search results for display
 */
function formatSearchResults(results: DoffinSearchResponse): string {
  const { notices, totalCount, page, pageSize } = results;
  
  if (notices.length === 0) {
    return "No RFP publications found matching your search criteria.";
  }

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);
  
  let output = `Found ${totalCount} RFP publication(s). Showing results ${startIndex}-${endIndex}:\n\n`;
  
  notices.forEach((notice, index) => {
    output += `${startIndex + index}. ${notice.title}\n`;
    output += `   Notice ID: ${notice.noticeId}\n`;
    output += `   Published: ${notice.publishedDate}\n`;
    
    if (notice.buyerName) {
      output += `   Buyer: ${notice.buyerName}\n`;
    }
    
    if (notice.deadline) {
      output += `   Deadline: ${notice.deadline}\n`;
    }
    
    if (notice.description) {
      const shortDesc = notice.description.substring(0, 200);
      output += `   Description: ${shortDesc}${notice.description.length > 200 ? "..." : ""}\n`;
    }
    
    if (notice.cpvCodes && notice.cpvCodes.length > 0) {
      output += `   CPV Codes: ${notice.cpvCodes.join(", ")}\n`;
    }
    
    output += "\n";
  });
  
  if (totalCount > endIndex) {
    output += `\nUse page parameter to see more results (${Math.ceil(totalCount / pageSize)} total pages).`;
  }
  
  return output;
}

/**
 * Main server implementation
 */
async function main() {
  // Create server instance
  const server = new Server(
    {
      name: "doffin-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define the search_rfp tool
  const searchRfpTool: Tool = {
    name: "search_rfp",
    description: 
      "Search Doffin (Norway's official procurement database) for RFP (Request for Proposal) publications. " +
      "Returns details about public procurement notices including titles, deadlines, buyer information, and descriptions. " +
      "Useful for finding tender opportunities in Norway.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query text to filter notices (optional). Can include keywords related to the procurement topic.",
        },
        page: {
          type: "number",
          description: "Page number for pagination (default: 1)",
          default: 1,
        },
        pageSize: {
          type: "number",
          description: "Number of results per page, maximum 100 (default: 20)",
          default: 20,
        },
      },
    },
  };

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [searchRfpTool],
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search_rfp") {
      try {
        // Validate and parse arguments
        const args = SearchRfpArgsSchema.parse(request.params.arguments || {});
        
        // Perform the search
        const results = await searchDoffinRfp(args.query, args.page, args.pageSize);
        
        // Format the results
        const formattedResults = formatSearchResults(results);
        
        return {
          content: [
            {
              type: "text",
              text: formattedResults,
            },
          ],
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid arguments: ${error.errors.map(e => e.message).join(", ")}`,
              },
            ],
            isError: true,
          };
        }
        
        if (error instanceof Error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        throw error;
      }
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Doffin MCP Server running on stdio");
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
