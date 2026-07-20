import {
  calculateGematria,
  getGematriaBreakdown,
  isHebrew,
  normalizeHebrew,
} from '../utils/gematriaMap.js';

class GematriaService {
  /**
   * Procesa un texto y calcula su valor gemátrico.
   */
  async processText(text) {
    const trimmed = text.trim();

    if (!isHebrew(trimmed)) {
      throw new Error('El texto debe contener caracteres hebreos');
    }

    const normalized = normalizeHebrew(trimmed);
    if (!normalized) {
      throw new Error('No se pudo normalizar el texto hebreo');
    }

    const value = calculateGematria(trimmed);
    if (value < 1 || value > 10000) {
      throw new Error('Valor gemátrico fuera del rango válido (1-10000)');
    }

    return {
      original: trimmed,
      normalized,
      value,
      breakdown: getGematriaBreakdown(trimmed),
      letterCount: normalized.length,
    };
  }

  /**
   * Compara dos textos por valor gemátrico.
   */
  compareTexts(text1, text2) {
    const normalized1 = normalizeHebrew(text1);
    const normalized2 = normalizeHebrew(text2);
    const value1 = calculateGematria(text1);
    const value2 = calculateGematria(text2);

    return {
      text1: { normalized: normalized1, value: value1 },
      text2: { normalized: normalized2, value: value2 },
      equal: value1 === value2,
    };
  }
}

export default new GematriaService();
