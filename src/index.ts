#!/usr/bin/env node

/**
 * Doffin MCP Server
 * Provides access to Norwegian public procurement notices via the Doffin API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  DoffinNotice,
  DoffinNoticeDetails,
  DoffinDocument,
  DoffinSearchResponse,
  CpvCode,
  ReferenceData,
  SearchNoticesParams,
  ApiError,
} from './types.js';

const API_BASE_URL = 'https://api.doffin.no/doffin';

/**
 * Logger utility
 */
class Logger {
  private static log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };
    console.error(JSON.stringify(logMessage));
  }

  static info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  static error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  static debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }
}

/**
 * API Client for Doffin
 */
class DoffinApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value);
        }
      });
    }

    Logger.info(`Making request to: ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DoffinMCPServer/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        Logger.error(`API request failed: ${response.status}`, {
          url: url.toString(),
          status: response.status,
          error: errorText
        });

        throw new Error(
          `API request failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Request error: ${error.message}`, { url: url.toString() });
        throw error;
      }
      throw new Error('Unknown error occurred during API request');
    }
  }

  async searchNotices(params: SearchNoticesParams): Promise<DoffinSearchResponse> {
    const queryParams: Record<string, string> = {};

    if (params.query) queryParams.query = params.query;
    if (params.status) queryParams.status = params.status;
    if (params.publishedFrom) queryParams.publishedFrom = params.publishedFrom;
    if (params.publishedTo) queryParams.publishedTo = params.publishedTo;
    if (params.cpvCodes) queryParams.cpvCodes = params.cpvCodes;
    if (params.buyerName) queryParams.buyerName = params.buyerName;
    if (params.page !== undefined) queryParams.page = params.page.toString();
    if (params.size !== undefined) queryParams.size = Math.min(params.size, 100).toString();

    return this.makeRequest<DoffinSearchResponse>('/notices', queryParams);
  }

  async getNoticeDetails(noticeId: string): Promise<DoffinNoticeDetails> {
    return this.makeRequest<DoffinNoticeDetails>(`/notices/${noticeId}`);
  }

  async getNoticeDocuments(noticeId: string): Promise<DoffinDocument[]> {
    return this.makeRequest<DoffinDocument[]>(`/notices/${noticeId}/documents`);
  }

  async getCpvCodes(query?: string): Promise<CpvCode[]> {
    const params = query ? { query } : {};
    return this.makeRequest<CpvCode[]>('/reference/cpv', params);
  }

  async getReferenceData(type: string): Promise<ReferenceData[]> {
    return this.makeRequest<ReferenceData[]>(`/reference/${type}`);
  }
}

/**
 * MCP Server implementation
 */
class DoffinMcpServer {
  private server: Server;
  private apiClient: DoffinApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'doffin-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiClient = new DoffinApiClient();
    this.setupHandlers();

    // Error handling
    this.server.onerror = (error) => {
      Logger.error('Server error:', error);
    };

    process.on('SIGINT', async () => {
      Logger.info('Shutting down server...');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await this.handleToolCall(request.params.name, request.params.arguments || {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Logger.error(`Tool execution error: ${errorMessage}`, {
          tool: request.params.name,
          error
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'search_notices',
        description: 'Search Norwegian public procurement notices with filters. Returns a paginated list of notices matching the search criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free text search across notice titles and descriptions',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'EXPIRED', 'AWARDED'],
              description: 'Filter by notice status',
            },
            publishedFrom: {
              type: 'string',
              description: 'Filter notices published from this date (ISO format: YYYY-MM-DD)',
            },
            publishedTo: {
              type: 'string',
              description: 'Filter notices published until this date (ISO format: YYYY-MM-DD)',
            },
            cpvCodes: {
              type: 'string',
              description: 'Comma-separated list of CPV classification codes',
            },
            buyerName: {
              type: 'string',
              description: 'Filter by buyer organization name',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (0-indexed)',
              default: 0,
            },
            size: {
              type: 'number',
              description: 'Number of results per page (max 100)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'get_notice_details',
        description: 'Get detailed information about a specific procurement notice including full description, requirements, contact information, and award criteria.',
        inputSchema: {
          type: 'object',
          properties: {
            noticeId: {
              type: 'string',
              description: 'The unique identifier of the notice',
            },
          },
          required: ['noticeId'],
        },
      },
      {
        name: 'get_notice_documents',
        description: 'Get a list of all documents attached to a procurement notice, including tender documents, specifications, and annexes.',
        inputSchema: {
          type: 'object',
          properties: {
            noticeId: {
              type: 'string',
              description: 'The unique identifier of the notice',
            },
          },
          required: ['noticeId'],
        },
      },
      {
        name: 'get_cpv_codes',
        description: 'Search CPV (Common Procurement Vocabulary) classification codes used to categorize procurement contracts.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to find relevant CPV codes',
            },
          },
        },
      },
      {
        name: 'get_reference_data',
        description: 'Get reference data such as notice types, procedure types, and contract types used in the procurement system.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['notice-types', 'procedure-types', 'contract-types'],
              description: 'The type of reference data to retrieve',
            },
          },
          required: ['type'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    Logger.info(`Tool called: ${name}`, { args });

    switch (name) {
      case 'search_notices':
        return await this.handleSearchNotices(args);

      case 'get_notice_details':
        return await this.handleGetNoticeDetails(args);

      case 'get_notice_documents':
        return await this.handleGetNoticeDocuments(args);

      case 'get_cpv_codes':
        return await this.handleGetCpvCodes(args);

      case 'get_reference_data':
        return await this.handleGetReferenceData(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async handleSearchNotices(args: any) {
    const params: SearchNoticesParams = {
      query: args.query,
      status: args.status,
      publishedFrom: args.publishedFrom,
      publishedTo: args.publishedTo,
      cpvCodes: args.cpvCodes,
      buyerName: args.buyerName,
      page: args.page || 0,
      size: args.size || 20,
    };

    const response = await this.apiClient.searchNotices(params);

    const formattedResults = response.content.map((notice) => {
      return [
        `**Notice ID:** ${notice.id}`,
        `**Title:** ${notice.title}`,
        `**Status:** ${notice.status}`,
        `**Published:** ${notice.publishedDate}`,
        notice.deadline ? `**Deadline:** ${notice.deadline}` : null,
        `**Buyer:** ${notice.buyer.name}`,
        notice.buyer.city ? `**Location:** ${notice.buyer.city}, ${notice.buyer.country || ''}` : null,
        notice.cpvCodes && notice.cpvCodes.length > 0 ? `**CPV Codes:** ${notice.cpvCodes.join(', ')}` : null,
        notice.description ? `**Description:** ${notice.description.substring(0, 200)}${notice.description.length > 200 ? '...' : ''}` : null,
        '---',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const summary = [
      `# Search Results`,
      ``,
      `Found **${response.totalElements}** notices (Page ${response.number + 1} of ${response.totalPages})`,
      `Showing ${response.content.length} results`,
      ``,
      formattedResults,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  }

  private async handleGetNoticeDetails(args: any) {
    if (!args.noticeId) {
      throw new Error('noticeId is required');
    }

    const notice = await this.apiClient.getNoticeDetails(args.noticeId);

    const details = [
      `# Notice Details: ${notice.title}`,
      ``,
      `**Notice ID:** ${notice.id}`,
      `**Status:** ${notice.status}`,
      `**Published Date:** ${notice.publishedDate}`,
      notice.deadline ? `**Deadline:** ${notice.deadline}` : null,
      ``,
      `## Buyer Information`,
      `**Name:** ${notice.buyer.name}`,
      notice.buyer.organizationNumber ? `**Organization Number:** ${notice.buyer.organizationNumber}` : null,
      notice.buyer.city ? `**Location:** ${notice.buyer.city}, ${notice.buyer.country || ''}` : null,
      ``,
      `## Procurement Details`,
      notice.type ? `**Notice Type:** ${notice.type}` : null,
      notice.procedureType ? `**Procedure Type:** ${notice.procedureType}` : null,
      notice.contractType ? `**Contract Type:** ${notice.contractType}` : null,
      notice.cpvCodes && notice.cpvCodes.length > 0 ? `**CPV Codes:** ${notice.cpvCodes.join(', ')}` : null,
      notice.estimatedValue ? `**Estimated Value:** ${notice.estimatedValue.amount} ${notice.estimatedValue.currency}` : null,
      ``,
      `## Description`,
      notice.description || 'No description available',
      ``,
      notice.requirements ? `## Requirements\n${notice.requirements}\n` : null,
      notice.awardCriteria ? `## Award Criteria\n${notice.awardCriteria}\n` : null,
      notice.contactInfo ? `## Contact Information\n${notice.contactInfo.name ? `**Name:** ${notice.contactInfo.name}\n` : ''}${notice.contactInfo.email ? `**Email:** ${notice.contactInfo.email}\n` : ''}${notice.contactInfo.phone ? `**Phone:** ${notice.contactInfo.phone}\n` : ''}` : null,
      notice.additionalInfo ? `## Additional Information\n${notice.additionalInfo}` : null,
    ].filter(Boolean).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: details,
        },
      ],
    };
  }

  private async handleGetNoticeDocuments(args: any) {
    if (!args.noticeId) {
      throw new Error('noticeId is required');
    }

    const documents = await this.apiClient.getNoticeDocuments(args.noticeId);

    if (documents.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No documents found for notice ${args.noticeId}`,
          },
        ],
      };
    }

    const documentList = documents.map((doc) => {
      return [
        `**${doc.name}**`,
        `- Type: ${doc.type}`,
        `- URL: ${doc.url}`,
        doc.size ? `- Size: ${(doc.size / 1024).toFixed(2)} KB` : null,
        doc.uploadedDate ? `- Uploaded: ${doc.uploadedDate}` : null,
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const result = [
      `# Documents for Notice ${args.noticeId}`,
      ``,
      `Found **${documents.length}** document(s)`,
      ``,
      documentList,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleGetCpvCodes(args: any) {
    const codes = await this.apiClient.getCpvCodes(args.query);

    if (codes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: args.query
              ? `No CPV codes found matching "${args.query}"`
              : 'No CPV codes available',
          },
        ],
      };
    }

    const codeList = codes.map((code) => {
      return `- **${code.code}**: ${code.description}`;
    }).join('\n');

    const result = [
      `# CPV Classification Codes`,
      ``,
      args.query ? `Search: "${args.query}"` : 'All CPV Codes',
      ``,
      `Found **${codes.length}** code(s)`,
      ``,
      codeList,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  private async handleGetReferenceData(args: any) {
    if (!args.type) {
      throw new Error('type is required (notice-types, procedure-types, or contract-types)');
    }

    const validTypes = ['notice-types', 'procedure-types', 'contract-types'];
    if (!validTypes.includes(args.type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const data = await this.apiClient.getReferenceData(args.type);

    if (data.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No reference data found for type: ${args.type}`,
          },
        ],
      };
    }

    const dataList = data.map((item) => {
      return [
        `**${item.code}**: ${item.name}`,
        item.description ? `  ${item.description}` : null,
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const result = [
      `# Reference Data: ${args.type}`,
      ``,
      `Found **${data.length}** item(s)`,
      ``,
      dataList,
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    Logger.info('Doffin MCP Server started successfully');
  }
}

// Start the server
const server = new DoffinMcpServer();
server.run().catch((error) => {
  Logger.error('Failed to start server:', error);
  process.exit(1);
});
