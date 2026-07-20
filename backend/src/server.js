import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Importar rutas
import queryRoutes from './routes/query.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import mercadopagoWebhookRoutes from './routes/mercadopago.webhook.routes.js';
import paypalWebhookRoutes from './routes/paypal.webhook.routes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

// Seguridad con Helmet
app.use(helmet());

// CORS (acepta una o varias URLs separadas por coma)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));

// Rate limiting (100 requests por 15 minutos por IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Por favor espera unos minutos antes de reintentar'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Rate limiting más estricto para queries
const queryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20,
  message: {
    error: 'Demasiadas consultas',
    message: 'Por favor espera antes de hacer más consultas'
  }
});

// Webhooks de proveedores de pago
// Mercado Pago y PayPal usan JSON, pueden ir después de express.json()
// pero los dejamos aquí por consistencia

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhooks de proveedores de pago (después de body parser)
app.use('/api/webhooks/mercadopago', mercadopagoWebhookRoutes);
app.use('/api/webhooks/paypal', paypalWebhookRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// RUTAS PRINCIPALES
// ============================================
app.use('/api/query', queryLimiter, queryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  
  res.status(err.status || 500).json({
    error: 'Error del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🕎 GEMATRIA BOT API                     ║
║                                           ║
║   🚀 Servidor: http://localhost:${PORT}     ║
║   🌍 Ambiente: ${process.env.NODE_ENV || 'development'}              ║
║   📅 ${new Date().toLocaleString()}          ║
╚═══════════════════════════════════════════╝
  `);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

export default app;