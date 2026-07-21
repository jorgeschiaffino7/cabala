import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { validatePlanLimits, incrementQueryCounter } from '../middleware/planValidator.js';
import gematriaService from '../services/gematria.service.js';
import textSearchService from '../services/textSearch.service.js';
import aiService from '../services/ai.service.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/query
 * Endpoint principal del bot
 * Acepta usuarios autenticados y no autenticados
 */
router.post(
  '/',
  optionalAuth,
  validatePlanLimits,
  incrementQueryCounter,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { text } = req.body;

      // Validación de input
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          error: 'Texto inválido',
          message: 'Debes proporcionar un texto para analizar'
        });
      }

      if (text.length > 500) {
        return res.status(400).json({
          error: 'Texto muy largo',
          message: 'El texto no debe exceder 500 caracteres'
        });
      }

      // PASO 1: Calcular gematría
      let gematriaResult;
      try {
        gematriaResult = await gematriaService.processText(text);
      } catch (error) {
        return res.status(400).json({
          error: 'Error de gematría',
          message: error.message
        });
      }

      // PASO 2: Buscar textos relacionados (por valor exacto y por contenido)
      const matchedTexts = await textSearchService.findByGematria(
        gematriaResult.value,
        {
          limit: req.userPlan === 'Avanzado' ? 15 : 10,
          hebrewWord: gematriaResult.normalized
        }
      );

      const formattedTexts = textSearchService.formatTextsForDisplay(matchedTexts);

      // PASO 3: Interpretación con IA
      const aiInterpretation = await aiService.interpret({
        inputText: text,
        hebrewText: gematriaResult.normalized,
        gematriaValue: gematriaResult.value,
        breakdown: gematriaResult.breakdown,
        matchedTexts: formattedTexts,
        userPlan: req.userPlan
      });

      // PASO 4: Guardar query en historial (solo usuarios registrados)
      let queryId = null;
      if (req.userId) {
        const { data: savedQuery, error: saveError } = await supabaseAdmin
          .from('queries')
          .insert({
            user_id: req.userId,
            input_text: text,
            translated_hebrew: gematriaResult.normalized,
            gematria_value: gematriaResult.value,
            matched_texts: formattedTexts,
            ai_response: aiInterpretation.response,
            plan_used: req.userPlan,
            processing_time_ms: Date.now() - startTime
          })
          .select('id')
          .single();

        if (!saveError) {
          queryId = savedQuery.id;
        }
      }

      // PASO 5: Log de IA (auditoría)
      if (queryId) {
        await aiService.logAICall({
          userId: req.userId,
          queryId,
          prompt: aiService.buildUserPrompt({
            inputText: text,
            hebrewText: gematriaResult.normalized,
            gematriaValue: gematriaResult.value,
            breakdown: gematriaResult.breakdown,
            matchedTexts: formattedTexts,
            userPlan: req.userPlan
          }),
          response: aiInterpretation.response,
          metadata: aiInterpretation.metadata
        });
      }

      // RESPUESTA FINAL
      res.json({
        success: true,
        data: {
          input: {
            original: text,
            hebrew: gematriaResult.normalized,
            breakdown: gematriaResult.breakdown
          },
          gematria: {
            value: gematriaResult.value,
            letterCount: gematriaResult.letterCount
          },
          matchedTexts: formattedTexts,
          interpretation: aiInterpretation.response,
          metadata: {
            textsFound: formattedTexts.length,
            processingTimeMs: Date.now() - startTime,
            plan: req.userPlan,
            queriesRemaining: req.queriesRemaining
          }
        }
      });

    } catch (error) {
      console.error('Error en query:', error);
      
      res.status(500).json({
        error: 'Error del servidor',
        message: 'Ocurrió un error al procesar tu consulta',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/query/history
 * Obtiene historial del usuario (solo autenticados)
 */
router.get('/history', optionalAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Debes iniciar sesión para ver tu historial'
      });
    }

    const { limit = 20, offset = 0 } = req.query;

    const { data: queries, error } = await supabaseAdmin
      .from('queries')
      .select('id, input_text, gematria_value, created_at, plan_used')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: queries,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: queries.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      error: 'Error del servidor',
      message: 'Error al obtener historial'
    });
  }
});

/**
 * GET /api/query/history/:id
 * Obtiene detalle de una consulta específica
 */
router.get('/history/:id', optionalAuth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'No autorizado'
      });
    }

    const { id } = req.params;

    const { data: query, error } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (error || !query) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      data: query
    });

  } catch (error) {
    console.error('Error obteniendo consulta:', error);
    res.status(500).json({
      error: 'Error del servidor'
    });
  }
});

export default router;