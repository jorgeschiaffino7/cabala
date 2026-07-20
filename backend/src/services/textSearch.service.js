import { supabaseAdmin } from '../config/supabase.js';

class TextSearchService {
  /**
   * Busca textos con un valor gemátrico exacto.
   */
  async findByGematria(value, options = {}) {
    const { sources, limit = 10, offset = 0 } = options;

    let query = supabaseAdmin
      .from('texts')
      .select('*')
      .eq('gematria_value', value)
      .order('source', { ascending: true })
      .order('book', { ascending: true })
      .order('chapter', { ascending: true })
      .order('verse', { ascending: true })
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
    }));
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
