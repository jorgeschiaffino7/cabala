import { supabaseAdmin } from '../config/supabase.js';
import { normalizeHebrew } from '../utils/gematriaMap.js';

class TextSearchService {
  /**
   * Busca textos con un valor gemátrico exacto O que contengan la palabra hebrea.
   */
  async findByGematria(value, options = {}) {
    const { sources, limit = 10, offset = 0, hebrewWord = null } = options;

    const results = [];

    // 1. Buscar coincidencias exactas de valor (para diccionarios/palabras)
    let exactQuery = supabaseAdmin
      .from('texts')
      .select('*')
      .eq('gematria_value', value)
      .order('source', { ascending: true })
      .order('book', { ascending: true })
      .limit(Math.ceil(limit / 2));

    if (sources?.length) {
      exactQuery = exactQuery.in('source', sources);
    }

    const { data: exactMatches, error: exactError } = await exactQuery;
    if (!exactError && exactMatches) {
      results.push(...exactMatches.map(t => ({ ...t, matchType: 'exact_value' })));
    }

    // 2. Buscar versículos que CONTENGAN la palabra hebrea (si se proporciona)
    if (hebrewWord) {
      const normalizedWord = normalizeHebrew(hebrewWord);
      if (normalizedWord && normalizedWord.length >= 2) {
        // Crear patrón regex que permita nikud entre letras: א[ָֹּ]*ו[ָֹּ]*ר
        const regexPattern = [...normalizedWord].join('[\\u0591-\\u05C7]*');
        
        let contentQuery = supabaseAdmin
          .from('texts')
          .select('*')
          .filter('text_hebrew', 'ilike', `%${normalizedWord}%`) // Búsqueda básica primero
          .neq('source', 'BDB')
          .order('source', { ascending: true })
          .order('book', { ascending: true })
          .limit(limit);

        if (sources?.length) {
          contentQuery = contentQuery.in('source', sources);
        }

        const { data: contentMatches, error: contentError } = await contentQuery;
        
        // Si no hay resultados, intentar búsqueda más flexible letra por letra
        if ((!contentMatches || contentMatches.length === 0) && !contentError) {
          // Buscar cada letra individualmente con comodines
          const flexPattern = [...normalizedWord].join('%');
          let flexQuery = supabaseAdmin
            .from('texts')
            .select('*')
            .ilike('text_hebrew', `%${flexPattern}%`)
            .neq('source', 'BDB')
            .order('source', { ascending: true })
            .limit(limit);

          if (sources?.length) {
            flexQuery = flexQuery.in('source', sources);
          }

          const { data: flexMatches } = await flexQuery;
          if (flexMatches) {
            const existingIds = new Set(results.map(r => r.id));
            const newMatches = flexMatches
              .filter(t => !existingIds.has(t.id))
              .map(t => ({ ...t, matchType: 'contains_word' }));
            results.push(...newMatches);
          }
        } else if (contentMatches) {
          const existingIds = new Set(results.map(r => r.id));
          const newMatches = contentMatches
            .filter(t => !existingIds.has(t.id))
            .map(t => ({ ...t, matchType: 'contains_word' }));
          results.push(...newMatches);
        }
      }
    }

    return results.slice(offset, offset + limit);
  }

  /**
   * Busca textos dentro de un rango de valores gemátricos.
   */
  async findByGematriaRange(minValue, maxValue, options = {}) {
    const { sources, limit = 10, offset = 0 } = options;

    let query = supabaseAdmin
      .from('texts')
      .select('*')
      .gte('gematria_value', minValue)
      .lte('gematria_value', maxValue)
      .order('gematria_value', { ascending: true })
      .range(offset, offset + limit - 1);

    if (sources?.length) {
      query = query.in('source', sources);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error buscando textos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Formatea resultados para la API y la IA.
   */
  formatTextsForDisplay(texts) {
    return texts.map((text) => ({
      id: text.id,
      reference: this.buildReference(text),
      source: text.source,
      book: text.book,
      chapter: text.chapter,
      verse: text.verse,
      section: text.section,
      textHebrew: text.text_hebrew,
      gematriaValue: text.gematria_value,
      matchType: text.matchType || 'exact_value',
      matchDescription: this.getMatchDescription(text),
    }));
  }

  /**
   * Genera descripción legible del tipo de coincidencia.
   */
  getMatchDescription(text) {
    if (text.matchType === 'contains_word') {
      return `Contiene la palabra en ${this.buildReference(text)}`;
    }
    return `Valor gemátrico igual (${text.gematria_value})`;
  }

  /**
   * Construye una referencia legible, ej: "Torah Genesis 1:1".
   */
  buildReference(text) {
    const parts = [];

    if (text.source) parts.push(text.source);
    if (text.book) parts.push(text.book);

    if (text.chapter != null) {
      if (text.verse != null) {
        parts.push(`${text.chapter}:${text.verse}`);
      } else {
        parts.push(String(text.chapter));
      }
    }

    if (text.section) {
      parts.push(text.section);
    }

    return parts.join(' ');
  }
}

export default new TextSearchService();
