import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Format currency in USD
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date, formatString = 'PPP'): string => {
  if (!date) return '';
  return format(new Date(date), formatString, { locale: es });
};

/**
 * Format date as relative time
 */
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es,
  });
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, total: number): string => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
};

/**
 * Truncate text
 */
export const truncateText = (text: string, maxLength = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format gematria breakdown
 */
interface GematriaBreakdownItem {
  letter: string;
  value: number;
}

export const formatGematriaBreakdown = (breakdown: GematriaBreakdownItem[]): string => {
  if (!breakdown || !Array.isArray(breakdown)) return '';
  return breakdown
    .map(item => `${item.letter} (${item.value})`)
    .join(' + ');
};

/**
 * Format reference (source + book + chapter:verse)
 */
export const formatReference = (
  source: string,
  book?: string,
  chapter?: number,
  verse?: number
): string => {
  const parts = [source];
  if (book) parts.push(book);
  if (chapter && verse) parts.push(`${chapter}:${verse}`);
  else if (chapter) parts.push(chapter.toString());
  return parts.join(' ');
};

/**
 * Parse Hebrew text (remove nikud)
 */
export const normalizeHebrew = (text: string): string => {
  if (!text) return '';
  // Remove nikud (vowel points) Unicode range U+0591 to U+05C7
  return text.replace(/[\u0591-\u05C7]/g, '');
};

/**
 * Check if text contains Hebrew
 */
export const containsHebrew = (text: string): boolean => {
  if (!text) return false;
  return /[\u0590-\u05FF]/.test(text);
};

/**
 * Format plan name for display
 */
export const formatPlanName = (planName: string | null | undefined): string => {
  if (!planName) return 'Free';
  return planName.charAt(0).toUpperCase() + planName.slice(1);
};

/**
 * Format queries remaining text
 */
export const formatQueriesRemaining = (
  remaining: number | null,
  limit: number | null
): string => {
  if (limit === null) return 'Ilimitadas';
  if (remaining === null) return '0';
  return `${remaining} / ${limit}`;
};