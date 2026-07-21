export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Gematria Bot';

// Plans
export const PLAN_NAMES = {
  FREE: 'Free',
  ESTUDIO: 'Estudio',
  AVANZADO: 'Avanzado',
} as const;

export type PlanName = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];

export const PLAN_LIMITS: Record<PlanName, number | null> = {
  [PLAN_NAMES.FREE]: 3,
  [PLAN_NAMES.ESTUDIO]: 100,
  [PLAN_NAMES.AVANZADO]: null, // unlimited
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PRICING: '/pricing',
  HISTORY: '/history',
  SETTINGS: '/settings',
  ABOUT: '/about',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  QUERY: '/api/query',
  HISTORY: '/api/query/history',
  PLANS: '/api/subscriptions/plans',
  CURRENT_SUBSCRIPTION: '/api/subscriptions/current',
  CREATE_CHECKOUT: '/api/subscriptions/create-checkout',
  CANCEL_SUBSCRIPTION: '/api/subscriptions/cancel',
  PAUSE_SUBSCRIPTION: '/api/subscriptions/pause',
  RESUME_SUBSCRIPTION: '/api/subscriptions/resume',
  PROVIDERS: '/api/subscriptions/providers',
  TRANSACTIONS: '/api/subscriptions/transactions',
} as const;

// Payment Providers
export const PAYMENT_PROVIDERS = {
  MERCADOPAGO: 'mercadopago',
  PAYPAL: 'paypal',
  NONE: 'none',
} as const;

export type PaymentProvider = typeof PAYMENT_PROVIDERS[keyof typeof PAYMENT_PROVIDERS];

// Countries supported by Mercado Pago
export const MERCADOPAGO_COUNTRIES = ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'] as const;

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// Toast messages
export const TOAST_MESSAGES = {
  QUERY_SUCCESS: 'Consulta realizada exitosamente',
  QUERY_ERROR: 'Error al procesar la consulta',
  LOGIN_SUCCESS: 'Sesión iniciada correctamente',
  LOGIN_ERROR: 'Error al iniciar sesión',
  REGISTER_SUCCESS: 'Cuenta creada exitosamente',
  REGISTER_ERROR: 'Error al crear la cuenta',
  LOGOUT_SUCCESS: 'Sesión cerrada',
  LIMIT_REACHED: 'Límite de consultas alcanzado',
  SUBSCRIPTION_SUCCESS: 'Suscripción actualizada',
  SUBSCRIPTION_ERROR: 'Error al procesar la suscripción',
  COPY_SUCCESS: 'Copiado al portapapeles',
  COPY_ERROR: 'Error al copiar',
} as const;

// Query limits for free users
export const FREE_QUERY_LIMIT = 3;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  HEBREW: /[\u0590-\u05FF]/,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  LAST_QUERY: 'last_query',
} as const;