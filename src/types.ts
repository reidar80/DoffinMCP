/**
 * Type definitions for the Doffin API
 * Based on https://betaapi.doffin.no/public/v2/
 */

export interface Organization {
  id: string;
  organizationId: string;
  name: string;
}

export interface EstimatedValue {
  currencyCode: string;
  amount: number;
}

export interface ReceivedTender {
  type: string;
  total: number;
}

export interface Lot {
  heading: string;
  description: string;
  winner: Organization[];
}

export interface PublicNoticeHit {
  id: string;
  buyer: Organization[];
  heading: string;
  description: string;
  locationId: string[];
  estimatedValue?: EstimatedValue;
  type: string;
  allTypes: string[];
  status?: string;
  issueDate: string;
  deadline?: string;
  publicationDate: string;
  receivedTenders?: number;
  allReceivedTenders?: ReceivedTender[];
  cpvCodes: string[];
  limitedDataFlag?: boolean;
  doffinClassicUrl?: string;
  lots?: Lot[];
}

export interface PagedPublicNoticeDto {
  numHitsTotal: number;
  numHitsAccessible: number;
  hits: PublicNoticeHit[];
}

export interface SearchNoticesParams {
  numHitsPerPage?: number;
  page?: number;
  sortBy?: string;
  searchString?: string;
  type?: string | string[];
  status?: string | string[];
  cpvCode?: string | string[];
  location?: string | string[];
  issueDateFrom?: string;
  issueDateTo?: string;
  estimatedValueFrom?: number;
  estimatedValueTo?: number;
}

export interface ApiError {
  error: string;
  details?: string;
  status?: number;
}

// Note: The following interfaces are for potential endpoints not documented in the API
// They are kept for potential future use if these endpoints become available

export interface DoffinNoticeDetails extends PublicNoticeHit {
  requirements?: string;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  awardCriteria?: string;
  additionalInfo?: string;
  links?: string[];
}

export interface DoffinDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedDate?: string;
}

export interface CpvCode {
  code: string;
  description: string;
  level?: number;
}

export interface ReferenceData {
  code: string;
  name: string;
  description?: string;
}
