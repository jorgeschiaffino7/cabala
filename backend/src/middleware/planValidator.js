import subscriptionService from '../services/subscription.service.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware para validar límites de plan
 * Verifica si el usuario puede hacer la consulta
 */
export const validatePlanLimits = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Si no hay usuario, validar uso free por IP
    if (!userId) {
      return validateFreeUsage(req, res, next);
    }

    // Verificar límites del plan
    const validation = await subscriptionService.canMakeQuery(userId);

    if (!validation.allowed) {
      return res.status(403).json({
        error: 'Límite alcanzado',
        message: validation.reason,
        plan: validation.plan,
        remaining: validation.remaining,
        upgradeRequired: true
      });
    }

    // Adjuntar info del plan al request
    req.userPlan = validation.plan;
    req.queriesRemaining = validation.remaining;

    next();
  } catch (error) {
    console.error('Error validando límites:', error);
    return res.status(500).json({
      error: 'Error de validación',
      message: 'Error al verificar límites del plan'
    });
  }
};

/**
 * Validar uso free para usuarios no registrados
 * Control por IP (mejorable con fingerprinting)
 */
async function validateFreeUsage(req, res, next) {
  try {
    // Obtener identificador (IP o fingerprint del header)
    const identifier = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      'unknown';

    // Hash simple del identificador
    const hashedIdentifier = Buffer.from(identifier).toString('base64');

    // Buscar o crear registro de uso
    let { data: usage, error } = await supabaseAdmin
      .from('free_usage')
      .select('*')
      .eq('identifier', hashedIdentifier)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
      throw error;
    }

    // Si no existe, crear
    if (!usage) {
      const { data: newUsage, error: createError } = await supabaseAdmin
        .from('free_usage')
        .insert({ identifier: hashedIdentifier, queries_count: 0 })
        .select()
        .single();

      if (createError) throw createError;
      usage = newUsage;
    }

    // Validar límite de 3 consultas
    if (usage.queries_count >= 3) {
      return res.status(403).json({
        error: 'Límite free alcanzado',
        message: 'Has usado tus 3 consultas gratuitas. Regístrate para continuar.',
        remaining: 0,
        requiresRegistration: true
      });
    }

    // Adjuntar info al request
    req.userPlan = 'Free';
    req.queriesRemaining = 3 - usage.queries_count;
    req.freeUsageId = usage.id;
    req.freeUsageIdentifier = hashedIdentifier;

    next();
  } catch (error) {
    console.error('Error validando uso free:', error);
    return res.status(500).json({
      error: 'Error de validación',
      message: 'Error al verificar uso gratuito'
    });
  }
}

/**
 * Incrementa contador después de consulta exitosa
 * Usar como middleware post-respuesta
 */
export const incrementQueryCounter = async (req, res, next) => {
  // Guardar la función send original
  const originalSend = res.send;

  res.send = function(data) {
    // Restaurar send original
    res.send = originalSend;

    // Si la respuesta fue exitosa (2xx), incrementar contador
    if (res.statusCode >= 200 && res.statusCode < 300) {
      incrementCounterAsync(req).catch(console.error);
    }

    // Enviar respuesta
    return res.send(data);
  };

  next();
};

/**
 * Incrementa contador en background
 */
async function incrementCounterAsync(req) {
  try {
    if (req.userId) {
      // Usuario registrado
      await subscriptionService.incrementUsage(req.userId);
    } else if (req.freeUsageIdentifier) {
      // Usuario free
      await supabaseAdmin
        .from('free_usage')
        .update({ 
          queries_count: req.queriesRemaining === null ? 3 : (3 - req.queriesRemaining + 1),
          last_query_at: new Date().toISOString()
        })
        .eq('identifier', req.freeUsageIdentifier);
    }
  } catch (error) {
    console.error('Error incrementando contador:', error);
  }
}