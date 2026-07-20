import { STORAGE_KEYS } from '@/utils/constants';

interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: 'es' | 'en';
  notifications?: boolean;
}

/**
 * Storage Service - handles localStorage operations
 */
class StorageService {
  /**
   * Set item in localStorage
   */
  setItem<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  /**
   * Get item from localStorage
   */
  getItem<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  /**
   * Clear all localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  // Specific helpers for common data

  /**
   * Store user preferences
   */
  setUserPreferences(preferences: UserPreferences): void {
    this.setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): UserPreferences {
    return this.getItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {}) ?? {};
  }

  /**
   * Store last query
   */
  setLastQuery(query: string): void {
    this.setItem(STORAGE_KEYS.LAST_QUERY, query);
  }

  /**
   * Get last query
   */
  getLastQuery(): string | null {
    return this.getItem<string>(STORAGE_KEYS.LAST_QUERY);
  }

  /**
   * Clear last query
   */
  clearLastQuery(): void {
    this.removeItem(STORAGE_KEYS.LAST_QUERY);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Clear auth tokens
   */
  clearAuthTokens(): void {
    this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
}

// Export singleton instance
export const storageService = new StorageService();

export default storageService;