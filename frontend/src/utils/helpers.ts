/**
 * Merge class names (for conditional styling)
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  };
  
  /**
   * Debounce function
   */
  export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait = 300
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  /**
   * Sleep utility
   */
  export const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));
  
  /**
   * Copy to clipboard
   */
  export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };
  
  /**
   * Get initials from name
   */
  export const getInitials = (name: string | null | undefined): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  /**
   * Calculate usage percentage
   */
  export const calculateUsagePercentage = (
    used: number,
    limit: number | null
  ): number => {
    if (!limit) return 0; // Unlimited
    return Math.min(Math.round((used / limit) * 100), 100);
  };
  
  /**
   * Get usage color based on percentage
   */
  export const getUsageColor = (percentage: number): 'green' | 'yellow' | 'red' => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };
  
  /**
   * Generate random ID
   */
  export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 9);
  };
  
  /**
   * Safe JSON parse
   */
  export const safeJsonParse = <T = any>(
    json: string,
    fallback: T | null = null
  ): T | null => {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  };
  
  /**
   * Check if user is on mobile (not available in Node.js backend)
   * This function exists for API compatibility but always returns false
   */
  export const isMobile = (): boolean => {
    // Navigator API is only available in browser environments
    // In Node.js backend, we cannot detect mobile devices
    return false;
  };
  
  /**
   * Scroll to top (not available in Node.js backend)
   * This function exists for API compatibility but does nothing
   */
  export const scrollToTop = (_behavior: 'auto' | 'smooth' = 'smooth'): void => {
    // Window API is only available in browser environments
    // In Node.js backend, scrolling is not applicable
    // Function exists for API compatibility but does nothing
  };
  
  /**
   * Get error message from error object
   */
  export const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }
    }
    return 'Ha ocurrido un error inesperado';
  };
  
  /**
   * Format file size
   */
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  /**
   * Check if value is empty
   */
  export const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };
  
  /**
   * Capitalize first letter
   */
  export const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };
  
  /**
   * Remove duplicates from array
   */
  export const removeDuplicates = <T>(array: T[]): T[] => {
    return Array.from(new Set(array));
  };
  
  /**
   * Group array by key
   */
  export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  };