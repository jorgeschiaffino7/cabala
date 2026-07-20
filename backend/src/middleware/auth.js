import { supabase } from '../config/supabase.js';

/**
 * Middleware de autenticación
 * Verifica JWT de Supabase y adjunta usuario a req
 */
export const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'Sesión expirada o token inválido'
      });
    }

    // Adjuntar usuario al request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      error: 'Error de autenticación',
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware opcional - permite usuarios no autenticados
 * Útil para endpoints que permiten acceso free
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      req.userId = user.id;
    } else {
      req.user = null;
      req.userId = null;
    }

    next();
  } catch (error) {
    console.error('Error en autenticación opcional:', error);
    req.user = null;
    req.userId = null;
    next();
  }
};