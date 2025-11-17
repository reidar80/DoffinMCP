#!/usr/bin/env node

/**
 * Doffin MCP Server
 * Provides access to Norwegian public procurement notices via the Doffin API
 * Based on https://betaapi.doffin.no/public/v2/
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  PagedPublicNoticeDto,
  PublicNoticeHit,
  SearchNoticesParams,
  DoffinNoticeDetails,
  DoffinDocument,
  CpvCode,
  ReferenceData,
} from './types.js';

const API_BASE_URL = 'https://betaapi.doffin.no/public/v2';
const API_KEY = process.env.DOFFIN_API_KEY || '';

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
  private apiKey: string;

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;

    if (!this.apiKey) {
      Logger.warn('No API key provided. Set DOFFIN_API_KEY environment variable for authenticated access.');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string | string[]>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Handle array parameters (e.g., multiple types, statuses, cpvCodes)
            value.forEach((v) => url.searchParams.append(key, v));
          } else {
            url.searchParams.append(key, value);
          }
        }
      });
    }

    Logger.info(`Making request to: ${url.toString()}`);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'DoffinMCPServer/1.0',
      };

      if (this.apiKey) {
        headers['Ocp-Apim-Subscription-Key'] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        Logger.error(`API request failed: ${response.status}`, {
          url: url.toString(),
          status: response.status,
          error: errorText
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Authentication failed. Please set a valid DOFFIN_API_KEY environment variable. Get your API key from the Doffin API portal.`
          );
        }

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

  async searchNotices(params: SearchNoticesParams): Promise<PagedPublicNoticeDto> {
    const queryParams: Record<string, string | string[]> = {};

    if (params.numHitsPerPage !== undefined) {
      queryParams.numHitsPerPage = params.numHitsPerPage.toString();
    }
    if (params.page !== undefined) {
      queryParams.page = params.page.toString();
    }
    if (params.sortBy) {
      queryParams.sortBy = params.sortBy;
    }
    if (params.searchString) {
      queryParams.searchString = params.searchString;
    }
    if (params.type) {
      queryParams.type = Array.isArray(params.type) ? params.type : [params.type];
    }
    if (params.status) {
      queryParams.status = Array.isArray(params.status) ? params.status : [params.status];
    }
    if (params.cpvCode) {
      queryParams.cpvCode = Array.isArray(params.cpvCode) ? params.cpvCode : [params.cpvCode];
    }
    if (params.location) {
      queryParams.location = Array.isArray(params.location) ? params.location : [params.location];
    }
    if (params.issueDateFrom) {
      queryParams.issueDateFrom = params.issueDateFrom;
    }
    if (params.issueDateTo) {
      queryParams.issueDateTo = params.issueDateTo;
    }
    if (params.estimatedValueFrom !== undefined) {
      queryParams.estimatedValueFrom = params.estimatedValueFrom.toString();
    }
    if (params.estimatedValueTo !== undefined) {
      queryParams.estimatedValueTo = params.estimatedValueTo.toString();
    }

    return this.makeRequest<PagedPublicNoticeDto>('/search', queryParams);
  }

  async downloadNotice(doffinId: string): Promise<any> {
    Logger.info(`Downloading notice: ${doffinId}`);
    return this.makeRequest<any>(`/download/${doffinId}`);
  }

  // Note: The following methods are for endpoints not documented in the public API
  // They are kept for potential future use but may not work without proper API documentation

  async getNoticeDetails(noticeId: string): Promise<DoffinNoticeDetails> {
    Logger.warn('get_notice_details: This endpoint is not documented in the public API and may not work.');
    return this.makeRequest<DoffinNoticeDetails>(`/notices/${noticeId}`);
  }

  async getNoticeDocuments(noticeId: string): Promise<DoffinDocument[]> {
    Logger.warn('get_notice_documents: This endpoint is not documented in the public API and may not work.');
    return this.makeRequest<DoffinDocument[]>(`/notices/${noticeId}/documents`);
  }

  async getCpvCodes(query?: string): Promise<CpvCode[]> {
    Logger.warn('get_cpv_codes: This endpoint is not documented in the public API and may not work.');
    const params = query ? { query } : {};
    return this.makeRequest<CpvCode[]>('/reference/cpv', params);
  }

  async getReferenceData(type: string): Promise<ReferenceData[]> {
    Logger.warn('get_reference_data: This endpoint is not documented in the public API and may not work.');
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
        version: '2.0.0',
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
        description: 'Search Norwegian public procurement notices with filters. Returns a paginated list of notices matching the search criteria. This is the primary tool for finding procurement opportunities.',
        inputSchema: {
          type: 'object',
          properties: {
            searchString: {
              type: 'string',
              description: 'Free text search across notice titles and descriptions',
            },
            numHitsPerPage: {
              type: 'number',
              description: 'Total number of results (hits) displayed on a single page',
              default: 20,
            },
            page: {
              type: 'number',
              description: 'The current page of results (0-indexed)',
              default: 0,
            },
            sortBy: {
              type: 'string',
              description: 'Sort property. Options: PUBLICATION_DATE_ASC, PUBLICATION_DATE_DESC (default)',
            },
            type: {
              type: 'string',
              description: 'Notice type filter. For multiple types, use comma-separated values (e.g., "COMPETITION,RESULT")',
            },
            status: {
              type: 'string',
              description: 'Notice status filter. Options: ACTIVE, EXPIRED, AWARDED. For multiple, use comma-separated values',
            },
            cpvCode: {
              type: 'string',
              description: 'CPV classification codes. For multiple codes, use comma-separated values',
            },
            location: {
              type: 'string',
              description: 'Location ID filter. For multiple locations, use comma-separated values. Use "anyw" for non-location-specific notices',
            },
            issueDateFrom: {
              type: 'string',
              description: 'Starting date in issue date range (format: YYYY-MM-DD)',
            },
            issueDateTo: {
              type: 'string',
              description: 'End date in issue date range (format: YYYY-MM-DD)',
            },
            estimatedValueFrom: {
              type: 'number',
              description: 'Minimum estimated value in range (numeric value)',
            },
            estimatedValueTo: {
              type: 'number',
              description: 'Maximum estimated value in range (numeric value)',
            },
          },
        },
      },
      {
        name: 'download_notice',
        description: 'Download the complete notice document for a specific Doffin ID. Returns the full notice data including all details and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            doffinId: {
              type: 'string',
              description: 'The Doffin ID of the notice to download (e.g., "2023-100282")',
            },
          },
          required: ['doffinId'],
        },
      },
      {
        name: 'get_notice_details',
        description: '[EXPERIMENTAL] Get detailed information about a specific procurement notice. Note: This endpoint is not documented in the official API and may not work.',
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
        description: '[EXPERIMENTAL] Get a list of all documents attached to a procurement notice. Note: This endpoint is not documented in the official API and may not work.',
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
        description: '[EXPERIMENTAL] Search CPV (Common Procurement Vocabulary) classification codes. Note: This endpoint is not documented in the official API and may not work.',
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
        description: '[EXPERIMENTAL] Get reference data such as notice types, procedure types, and contract types. Note: This endpoint is not documented in the official API and may not work.',
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

      case 'download_notice':
        return await this.handleDownloadNotice(args);

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
    // Parse comma-separated values into arrays
    const parseCommaSeparated = (value: string | undefined): string[] | undefined => {
      if (!value) return undefined;
      return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    };

    const params: SearchNoticesParams = {
      searchString: args.searchString,
      numHitsPerPage: args.numHitsPerPage,
      page: args.page,
      sortBy: args.sortBy,
      type: parseCommaSeparated(args.type),
      status: parseCommaSeparated(args.status),
      cpvCode: parseCommaSeparated(args.cpvCode),
      location: parseCommaSeparated(args.location),
      issueDateFrom: args.issueDateFrom,
      issueDateTo: args.issueDateTo,
      estimatedValueFrom: args.estimatedValueFrom,
      estimatedValueTo: args.estimatedValueTo,
    };

    const response = await this.apiClient.searchNotices(params);

    const formattedResults = response.hits.map((notice: PublicNoticeHit) => {
      const buyers = notice.buyer.map(b => b.name).join(', ');
      const locations = notice.locationId.length > 0 ? notice.locationId.join(', ') : 'N/A';
      const types = notice.allTypes.join(', ');

      return [
        `**Notice ID:** ${notice.id}`,
        `**Heading:** ${notice.heading}`,
        `**Type:** ${types}`,
        notice.status ? `**Status:** ${notice.status}` : null,
        `**Issue Date:** ${notice.issueDate}`,
        `**Publication Date:** ${notice.publicationDate}`,
        notice.deadline ? `**Deadline:** ${notice.deadline}` : null,
        `**Buyer:** ${buyers}`,
        `**Location:** ${locations}`,
        notice.estimatedValue ? `**Estimated Value:** ${notice.estimatedValue.amount.toLocaleString()} ${notice.estimatedValue.currencyCode}` : null,
        notice.cpvCodes.length > 0 ? `**CPV Codes:** ${notice.cpvCodes.join(', ')}` : null,
        notice.receivedTenders !== undefined ? `**Received Tenders:** ${notice.receivedTenders}` : null,
        notice.description ? `**Description:** ${notice.description.substring(0, 200)}${notice.description.length > 200 ? '...' : ''}` : null,
        notice.lots && notice.lots.length > 0 ? `**Lots:** ${notice.lots.length}` : null,
        notice.doffinClassicUrl ? `**Doffin URL:** ${notice.doffinClassicUrl}` : null,
        '---',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const summary = [
      `# Search Results`,
      ``,
      `**Total Hits:** ${response.numHitsTotal}`,
      `**Accessible Hits:** ${response.numHitsAccessible}`,
      `**Showing:** ${response.hits.length} results`,
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

  private async handleDownloadNotice(args: any) {
    if (!args.doffinId) {
      throw new Error('doffinId is required');
    }

    const noticeData = await this.apiClient.downloadNotice(args.doffinId);

    // Format the downloaded notice data for display
    // The actual structure depends on what the API returns
    const formattedData = JSON.stringify(noticeData, null, 2);

    const result = [
      `# Downloaded Notice: ${args.doffinId}`,
      ``,
      `## Complete Notice Data`,
      ``,
      '```json',
      formattedData,
      '```',
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

  private async handleGetNoticeDetails(args: any) {
    if (!args.noticeId) {
      throw new Error('noticeId is required');
    }

    const notice = await this.apiClient.getNoticeDetails(args.noticeId);

    const buyers = notice.buyer.map(b => `- ${b.name} (${b.organizationId})`).join('\n');
    const types = notice.allTypes.join(', ');

    const details = [
      `# Notice Details: ${notice.heading}`,
      ``,
      `**Notice ID:** ${notice.id}`,
      `**Type:** ${types}`,
      notice.status ? `**Status:** ${notice.status}` : null,
      `**Issue Date:** ${notice.issueDate}`,
      `**Publication Date:** ${notice.publicationDate}`,
      notice.deadline ? `**Deadline:** ${notice.deadline}` : null,
      ``,
      `## Buyer Information`,
      buyers,
      ``,
      `## Procurement Details`,
      notice.estimatedValue ? `**Estimated Value:** ${notice.estimatedValue.amount.toLocaleString()} ${notice.estimatedValue.currencyCode}` : null,
      notice.cpvCodes.length > 0 ? `**CPV Codes:** ${notice.cpvCodes.join(', ')}` : null,
      notice.locationId.length > 0 ? `**Locations:** ${notice.locationId.join(', ')}` : null,
      ``,
      `## Description`,
      notice.description || 'No description available',
      ``,
      notice.requirements ? `## Requirements\n${notice.requirements}\n` : null,
      notice.awardCriteria ? `## Award Criteria\n${notice.awardCriteria}\n` : null,
      notice.contactInfo ? `## Contact Information\n${notice.contactInfo.name ? `**Name:** ${notice.contactInfo.name}\n` : ''}${notice.contactInfo.email ? `**Email:** ${notice.contactInfo.email}\n` : ''}${notice.contactInfo.phone ? `**Phone:** ${notice.contactInfo.phone}\n` : ''}` : null,
      notice.lots && notice.lots.length > 0 ? `## Lots\n${notice.lots.map(lot => `### ${lot.heading}\n${lot.description}\n**Winners:** ${lot.winner.map(w => w.name).join(', ')}`).join('\n\n')}` : null,
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

    if (!API_KEY) {
      Logger.warn('');
      Logger.warn('╔════════════════════════════════════════════════════════════════╗');
      Logger.warn('║  WARNING: No API key configured!                              ║');
      Logger.warn('║  Set DOFFIN_API_KEY environment variable for API access.      ║');
      Logger.warn('║  Get your API key from the Doffin API portal.                 ║');
      Logger.warn('╚════════════════════════════════════════════════════════════════╝');
      Logger.warn('');
    }
  }
}

// Start the server
const server = new DoffinMcpServer();
server.run().catch((error) => {
  Logger.error('Failed to start server:', error);
  process.exit(1);
});
