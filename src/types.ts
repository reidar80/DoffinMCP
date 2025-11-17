/**
 * Type definitions for the Doffin API
 */

export interface DoffinNotice {
  id: string;
  title: string;
  status: 'ACTIVE' | 'EXPIRED' | 'AWARDED';
  publishedDate: string;
  deadline?: string;
  buyer: {
    name: string;
    organizationNumber?: string;
    city?: string;
    country?: string;
  };
  cpvCodes?: string[];
  description?: string;
  type?: string;
  procedureType?: string;
  contractType?: string;
  estimatedValue?: {
    amount: number;
    currency: string;
  };
}

export interface DoffinNoticeDetails extends DoffinNotice {
  description: string;
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

export interface DoffinSearchResponse {
  content: DoffinNotice[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
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

export interface SearchNoticesParams {
  query?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'AWARDED';
  publishedFrom?: string;
  publishedTo?: string;
  cpvCodes?: string;
  buyerName?: string;
  page?: number;
  size?: number;
}

export interface ApiError {
  error: string;
  details?: string;
  status?: number;
}
