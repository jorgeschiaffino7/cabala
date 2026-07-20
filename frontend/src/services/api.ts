import { API_URL, STORAGE_KEYS } from '@/utils/constants';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Base API client with error handling
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Build headers with auth token
   */
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || 'API request failed');
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(options.headers),
        ...options,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body: any = {},
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(options.headers),
        body: JSON.stringify(body),
        ...options,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body: any = {},
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(options.headers),
        body: JSON.stringify(body),
        ...options,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(options.headers),
        ...options,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL);

// Export default for backwards compatibility
export default apiClient;