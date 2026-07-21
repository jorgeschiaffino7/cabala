import { openai, OPENAI_MODEL } from '../config/openai.js';
import { supabaseAdmin } from '../config/supabase.js';

const SYSTEM_PROMPT = `Eres un asistente académico especializado en textos sagrados judíos y gematría.

REGLAS ESTRICTAS:
1. NUNCA inventes valores gemátricos - usa SOLO los datos proporcionados
2. NUNCA cites textos que no te fueron proporcionados
3. NUNCA afirmes verdades absolutas o proféticas
4. Si no hay textos relacionados, di "No se encontraron textos con este valor"
5. Usa lenguaje académico pero accesible
6. CRÍTICO: El desglose de letras ya fue calculado y verificado por el sistema. 
   Si mencionas el desglose, CÍTALO EXACTAMENTE como aparece en los datos proporcionados.
   NO recalcules ni reinterpretes los valores de las letras individuales.

ESTRUCTURA DE RESPUESTA:
1. Resumen breve del valor gemátrico
2. Relación con textos encontrados (si existen)
3. Posibles interpretaciones simbólicas
4. Disclaimer académico al final`;

const TOKEN_LIMITS = {
  Free: 300,
  Estudio: 600,
  Avanzado: 1000,
};

class AIService {
  /**
   * Genera interpretación con OpenAI.
   */
  async interpret({ inputText, hebrewText, gematriaValue, breakdown, matchedTexts, userPlan = 'Free' }) {
    if (!openai) {
      throw new Error('OpenAI no está configurado. Falta OPENAI_API_KEY.');
    }

    const prompt = this.buildUserPrompt({
      inputText,
      hebrewText,
      gematriaValue,
      breakdown,
      matchedTexts,
      userPlan,
    });

    const maxTokens = TOKEN_LIMITS[userPlan] || TOKEN_LIMITS.Free;
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      response,
      metadata: {
        model: completion.model || OPENAI_MODEL,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
        finishReason: completion.choices[0]?.finish_reason || 'unknown',
      },
    };
  }

  /**
   * Construye el prompt enviado a la IA.
   */
  buildUserPrompt({ inputText, hebrewText, gematriaValue, breakdown = [], matchedTexts = [] }) {
    const breakdownSection = breakdown.length
      ? breakdown.map(b => `${b.letter} = ${b.value}`).join(', ')
      : 'No disponible';

    const textsSection = matchedTexts.length
      ? matchedTexts
          .map((text, index) => {
            return `${index + 1}. ${text.reference}\n   Texto: ${text.textHebrew}`;
          })
          .join('\n\n')
      : 'No se encontraron textos con este valor en la base de datos.';

    return `Frase consultada: "${inputText}"
Texto hebreo: ${hebrewText}
Valor gemátrico TOTAL: ${gematriaValue}

DESGLOSE EXACTO POR LETRA (calculado y verificado por el sistema):
${breakdownSection}

IMPORTANTE: El desglose anterior ya fue calculado matemáticamente. 
NO reinterpretes ni recalcules los valores de las letras.
Si mencionas el desglose en tu respuesta, cítalo EXACTAMENTE como aparece arriba.

TEXTOS RELACIONADOS CON ESTE VALOR:
${textsSection}

Por favor, proporciona una interpretación académica y respetuosa de esta consulta.`;
  }

  /**
   * Guarda log de llamada a IA para auditoría.
   */
  async logAICall({ userId, queryId, prompt, response, metadata }) {
    try {
      const tokensUsed = metadata?.tokensUsed || 0;
      const model = metadata?.model || OPENAI_MODEL;

      const { error } = await supabaseAdmin.from('ai_logs').insert({
        user_id: userId,
        query_id: queryId,
        prompt,
        response,
        model,
        tokens_used: tokensUsed,
        cost_cents: this.calculateCost(tokensUsed, model),
      });

      if (error) {
        console.error('Error guardando ai_log:', error);
      }
    } catch (error) {
      console.error('Error en logAICall:', error);
    }
  }

  /**
   * Calcula costo aproximado en centavos USD.
   */
  calculateCost(tokens, model = OPENAI_MODEL) {
    const rates = {
      'gpt-4o-mini': 0.015,
      'gpt-4o': 0.5,
    };

    const ratePer1k = rates[model] ?? rates['gpt-4o-mini'];
    return Math.ceil((tokens / 1000) * ratePer1k);
  }
}

export default new AIService();
