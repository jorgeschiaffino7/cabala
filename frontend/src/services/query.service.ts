import { apiClient } from './api';
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE } from '@/utils/constants';

// Types for Query API responses
export interface GematriaBreakdown {
  letter: string;
  value: number;
}

export interface QueryInput {
  original: string;
  hebrew: string;
  breakdown: GematriaBreakdown[];
}

export interface GematriaValue {
  value: number;
  letterCount: number;
}

export interface MatchedText {
  id?: number;
  reference: string;
  hebrew: string;
  value: number;
  source: string;
  book?: string;
  chapter?: number;
  verse?: number;
}

export interface QueryMetadata {
  textsFound: number;
  processingTimeMs: number;
  plan: string;
  queriesRemaining?: number;
}

export interface QueryResult {
  input: QueryInput;
  gematria: GematriaValue;
  matchedTexts: MatchedText[];
  interpretation: string;
  metadata: QueryMetadata;
}

export interface QueryHistoryItem {
  id: string;
  input_text: string;
  translated_hebrew?: string;
  gematria_value: number;
  created_at: string;
  plan_used: string;
}

export interface QueryDetail extends QueryHistoryItem {
  matched_texts: MatchedText[];
  ai_response: string;
  processing_time_ms: number;
}

interface QueryResponse {
  success: boolean;
  data: QueryResult;
}

interface HistoryResponse {
  success: boolean;
  data: QueryHistoryItem[];
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface QueryDetailResponse {
  success: boolean;
  data: QueryDetail;
}

/**
 * Query Service - handles gematria queries
 */
class QueryService {
  /**
   * Submit a new query
   */
  async submitQuery(text: string): Promise<QueryResult> {
    try {
      const response = await apiClient.post<QueryResponse>(
        API_ENDPOINTS.QUERY,
        { text }
      );
      return response.data;
    } catch (error) {
      console.error('Submit query error:', error);
      throw error;
    }
  }

  /**
   * Get query history
   */
  async getHistory(
    limit: number = DEFAULT_PAGE_SIZE,
    offset: number = 0
  ): Promise<{ data: QueryHistoryItem[]; hasMore: boolean }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      const response = await apiClient.get<HistoryResponse>(
        `${API_ENDPOINTS.HISTORY}?${params}`
      );
      
      return {
        data: response.data,
        hasMore: response.pagination?.hasMore || false,
      };
    } catch (error) {
      console.error('Get history error:', error);
      throw error;
    }
  }

  /**
   * Get specific query by ID
   */
  async getQueryById(id: string): Promise<QueryDetail> {
    try {
      const response = await apiClient.get<QueryDetailResponse>(
        `${API_ENDPOINTS.HISTORY}/${id}`
      );
      return response.data;
    } catch (error) {
      console.error('Get query by ID error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const queryService = new QueryService();

export default queryService;