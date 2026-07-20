export const GEMATRIA_MAP = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
    'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20,
    'ל': 30, 'מ': 40, 'ם': 40,
    'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70,
    'פ': 80, 'ף': 80,
    'צ': 90, 'ץ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
  };
  
  export function normalizeHebrew(text = '') {
    return text
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[^\u05D0-\u05EA]/g, '')
      .trim();
  }
  
  export function calculateGematria(text) {
    const normalized = normalizeHebrew(text);
    if (!normalized) return 0;
    
    return [...normalized].reduce((sum, char) => {
      return sum + (GEMATRIA_MAP[char] || 0);
    }, 0);
  }
  
  export function isHebrew(text) {
    return /[\u0590-\u05FF]/.test(text);
  }
  
  export function getGematriaBreakdown(text) {
    const normalized = normalizeHebrew(text);
    return [...normalized].map(char => ({
      letter: char,
      value: GEMATRIA_MAP[char] || 0
    }));
  }