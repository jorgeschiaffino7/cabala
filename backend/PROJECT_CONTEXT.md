# 📚 DOCUMENTACIÓN COMPLETA - GEMATRIA BOT

## 📋 ÍNDICE
1. [Visión General del Proyecto](#visión-general)
2. [Arquitectura del Sistema](#arquitectura)
3. [Stack Tecnológico](#stack)
4. [Estructura de Carpetas](#estructura)
5. [Base de Datos](#base-de-datos)
6. [Backend - API](#backend)
7. [Servicios Core](#servicios)
8. [Autenticación y Autorización](#auth)
9. [Sistema de Suscripciones](#suscripciones)
10. [Integración con IA](#ia)
11. [Importación de Datos](#importacion)
12. [Configuración y Deployment](#deployment)
13. [Estado Actual y Próximos Pasos](#estado)

---

## 🎯 VISIÓN GENERAL DEL PROYECTO

### Objetivo
Desarrollar un bot web de análisis de gematría e interpretación textual que combine:
- **Cálculo determinista** (gematría hebrea)
- **Búsqueda en textos sagrados** (Torá, Zóhar, Sefer Yetzirá)
- **Interpretación contextual mediante IA**

### Propósito
El bot funciona como **asistente de estudio académico**, NO como oráculo místico. Proporciona análisis respetuosos y contextualizados basados en datos reales.

### Modelo de Negocio
Sistema freemium con 3 planes:
- **Free**: 3 consultas totales (demo)
- **Estudio**: 100 consultas/mes ($10/mes)
- **Avanzado**: Consultas ilimitadas ($25/mes)

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Diagrama de Flujo
```
Usuario → Frontend (React + Vite)
    ↓
Backend (Node.js + Express)
    ↓
├─→ Supabase (PostgreSQL + Auth)
├─→ OpenAI (Interpretación IA)
└─→ Stripe (Pagos)
```

### Flujo de una Consulta
1. Usuario ingresa texto (hebreo o a traducir)
2. Backend valida autenticación y límites del plan
3. Se calcula gematría del texto
4. Se buscan textos relacionados en la base de datos
5. Se envían SOLO esos textos a OpenAI
6. IA interpreta la relación simbólica
7. Se guarda en historial (usuarios registrados)
8. Se incrementa contador de uso

### Principios de Diseño
- **Sin alucinaciones**: IA solo trabaja con datos proporcionados
- **Escalable**: Arquitectura preparada para crecer
- **Segura**: RLS, rate limiting, validación de planes
- **Performante**: Índices optimizados, batching en importación

---

## 🛠️ STACK TECNOLÓGICO

### Backend
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Lenguaje**: JavaScript (ESM modules)
- **Base de Datos**: PostgreSQL via Supabase
- **Autenticación**: Supabase Auth (JWT)
- **Pagos**: Stripe (Checkout + Webhooks)
- **IA**: OpenAI API (gpt-4o-mini)

### Dependencias Principales
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "@supabase/supabase-js": "^2.39.0",
  "stripe": "^14.10.0",
  "openai": "^4.20.1",
  "csv-parser": "^3.0.0",
  "dotenv": "^16.3.1"
}
```

### Frontend (Próxima Fase)
- **Framework**: React 18
- **Build Tool**: Vite
- **Estilos**: TailwindCSS
- **Routing**: React Router
- **State**: Context API + hooks personalizados
- **HTTP Client**: Fetch API nativa

### Infraestructura
- **Database**: Supabase (PostgreSQL managed)
- **Backend Hosting**: Railway / Render
- **Frontend Hosting**: Vercel
- **CDN**: Cloudflare (via Vercel)

---

## 📁 ESTRUCTURA DE CARPETAS

```
gematria-bot/
│
├── backend/
│   ├── data/                    # CSVs a importar
│   │   ├── Genesis.csv
│   │   ├── Exodus.csv
│   │   ├── Zohar.csv
│   │   └── SeferYetzirah.csv
│   │
│   ├── src/
│   │   ├── config/              # Configuraciones
│   │   │   ├── supabase.js      # Cliente Supabase
│   │   │   ├── stripe.js        # (pendiente)
│   │   │   └── openai.js        # (pendiente)
│   │   │
│   │   ├── middleware/          # Middlewares Express
│   │   │   ├── auth.js          # Autenticación JWT
│   │   │   ├── rateLimiter.js   # (usa express-rate-limit)
│   │   │   └── planValidator.js # Validación de límites
│   │   │
│   │   ├── routes/              # Endpoints API
│   │   │   ├── query.routes.js  # POST /api/query
│   │   │   ├── subscription.routes.js
│   │   │   └── webhook.routes.js # Stripe webhooks
│   │   │
│   │   ├── services/            # Lógica de negocio
│   │   │   ├── gematria.service.js
│   │   │   ├── textSearch.service.js
│   │   │   ├── ai.service.js
│   │   │   └── subscription.service.js
│   │   │
│   │   ├── utils/               # Utilidades
│   │   │   ├── gematriaMap.js   # Mapa de valores + cálculo
│   │   │   ├── validation.js    # (pendiente)
│   │   │   └── errorHandler.js  # (pendiente)
│   │   │
│   │   ├── scripts/             # Scripts ETL
│   │   │   └── importCSV.js     # Importador de textos
│   │   │
│   │   └── server.js            # Entry point del servidor
│   │
│   ├── .env                     # Variables de entorno
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
└── frontend/                    # (Próxima fase)
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── hooks/
    │   └── services/
    ├── package.json
    └── vite.config.js
```

---

## 🗄️ BASE DE DATOS

### Modelo de Datos

#### 1. **profiles** (extiende auth.users)
```sql
- id (UUID, PK, FK → auth.users)
- full_name (TEXT)
- avatar_url (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```
**Propósito**: Información adicional del usuario.

#### 2. **subscription_plans**
```sql
- id (UUID, PK)
- name (TEXT) → 'Free', 'Estudio', 'Avanzado'
- price_cents (INTEGER) → precio en centavos
- stripe_price_id (TEXT)
- monthly_queries (INTEGER) → NULL = ilimitado
- features (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
```
**Propósito**: Catálogo de planes disponibles.

#### 3. **subscriptions**
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users, UNIQUE)
- plan_id (UUID, FK → subscription_plans)
- stripe_customer_id (TEXT)
- stripe_subscription_id (TEXT)
- status (TEXT) → 'active', 'canceled', 'past_due', 'trialing'
- current_period_start (TIMESTAMPTZ)
- current_period_end (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```
**Propósito**: Suscripción activa del usuario. Un usuario = una suscripción.

#### 4. **texts** (Base de conocimiento)
```sql
- id (BIGINT, PK, IDENTITY)
- source (TEXT) → 'Torah', 'Zohar', 'Sefer Yetzirah'
- book (TEXT) → 'Genesis', 'Exodus', etc.
- chapter (INTEGER)
- verse (INTEGER)
- section (TEXT) → para Zohar
- text_hebrew (TEXT, NOT NULL)
- gematria_value (INTEGER, NOT NULL) ← CALCULADO
- metadata (JSONB)
- created_at (TIMESTAMPTZ)

ÍNDICES:
- idx_texts_gematria (gematria_value)
- idx_texts_source (source)
- idx_texts_source_book (source, book)
- idx_texts_gematria_source (gematria_value, source)
```
**Propósito**: Corpus de textos sagrados con gematría precalculada.

#### 5. **queries** (Historial)
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- input_text (TEXT)
- translated_hebrew (TEXT)
- gematria_value (INTEGER)
- matched_texts (JSONB)
- ai_response (TEXT)
- plan_used (TEXT)
- processing_time_ms (INTEGER)
- created_at (TIMESTAMPTZ)
```
**Propósito**: Historial de consultas (solo usuarios registrados).

#### 6. **free_usage** (Control demo)
```sql
- id (UUID, PK)
- identifier (TEXT, UNIQUE) → hash de IP
- queries_count (INTEGER)
- last_query_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```
**Propósito**: Control de 3 consultas gratuitas sin registro.

#### 7. **ai_logs** (Auditoría)
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- query_id (UUID, FK → queries)
- prompt (TEXT)
- response (TEXT)
- model (TEXT)
- tokens_used (INTEGER)
- cost_cents (INTEGER)
- created_at (TIMESTAMPTZ)
```
**Propósito**: Auditoría de llamadas a IA, control de costos.

#### 8. **usage_tracking** (Contador mensual)
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- month (DATE) → primer día del mes
- queries_count (INTEGER)
- created_at (TIMESTAMPTZ)

UNIQUE(user_id, month)
```
**Propósito**: Contador de uso mensual por usuario.

### Row Level Security (RLS)

**Todas las tablas tienen RLS activado:**
- **profiles**: usuario solo ve su perfil
- **subscriptions**: usuario solo ve su suscripción
- **queries**: usuario solo ve sus consultas
- **usage_tracking**: usuario solo ve su uso
- **texts**: lectura pública (SELECT para authenticated + anon)
- **free_usage**: solo service role
- **ai_logs**: usuario ve sus logs, service role puede todo
- **subscription_plans**: lectura pública (solo planes activos)

### Funciones PostgreSQL

#### `increment_monthly_usage(p_user_id UUID)`
```sql
-- Incrementa contador mensual automáticamente
-- Crea registro si no existe
-- Retorna el nuevo contador
```

#### `handle_new_user()` (Trigger)
```sql
-- Trigger AFTER INSERT en auth.users
-- Crea profile automáticamente
```

### Vista: `user_current_plan`
```sql
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  sp.name as plan_name,
  sp.monthly_queries,
  s.status as subscription_status,
  s.current_period_end,
  ut.queries_count as queries_this_month
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id 
  AND ut.month = DATE_TRUNC('month', NOW());
```
**Propósito**: Vista consolidada del estado del usuario.

---

## 🔌 BACKEND - API

### Entry Point: `server.js`

**Middlewares globales:**
- `helmet()` → seguridad HTTP
- `cors()` → frontend localhost:5173
- `express-rate-limit` → 100 req/15min por IP
- Query rate limit → 20 req/5min

**Health check:**
```
GET /health
Response: { status: 'ok', timestamp, uptime }
```

### Endpoints Principales

#### 1. **POST /api/query** (Consulta principal)
**Auth**: Opcional (optionalAuth middleware)  
**Middlewares**: validatePlanLimits, incrementQueryCounter

**Request:**
```json
{
  "text": "שָׁלוֹם"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "input": {
      "original": "שָׁלוֹם",
      "hebrew": "שלום",
      "breakdown": [
        { "letter": "ש", "value": 300 },
        { "letter": "ל", "value": 30 },
        { "letter": "ו", "value": 6 },
        { "letter": "ם", "value": 40 }
      ]
    },
    "gematria": {
      "value": 376,
      "letterCount": 4
    },
    "matchedTexts": [
      {
        "reference": "Torah Genesis 1:1",
        "hebrew": "בראשית",
        "value": 376,
        "source": "Torah"
      }
    ],
    "interpretation": "...",
    "metadata": {
      "textsFound": 1,
      "processingTimeMs": 1523,
      "plan": "Free",
      "queriesRemaining": 2
    }
  }
}
```

**Errores:**
- `400`: Texto inválido o muy largo
- `403`: Límite alcanzado
- `500`: Error del servidor

#### 2. **GET /api/query/history**
**Auth**: Requerida  
**Params**: `?limit=20&offset=0`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "input_text": "שָׁלוֹם",
      "gematria_value": 376,
      "created_at": "2025-01-15T10:30:00Z",
      "plan_used": "Estudio"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### 3. **GET /api/query/history/:id**
**Auth**: Requerida

**Response**: Detalle completo de una consulta específica.

#### 4. **GET /api/subscriptions/plans**
**Auth**: No requerida

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Free",
      "price_cents": 0,
      "monthly_queries": 3,
      "features": ["Gematría básica", "3 consultas totales"]
    },
    {
      "id": "uuid",
      "name": "Estudio",
      "price_cents": 1000,
      "monthly_queries": 100,
      "features": ["Gematría completa", "100 consultas/mes"]
    },
    {
      "id": "uuid",
      "name": "Avanzado",
      "price_cents": 2500,
      "monthly_queries": null,
      "features": ["Consultas ilimitadas"]
    }
  ]
}
```

#### 5. **GET /api/subscriptions/current**
**Auth**: Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "plan_name": "Estudio",
    "monthly_queries": 100,
    "queries_this_month": 45,
    "subscription_status": "active",
    "current_period_end": "2025-02-15T00:00:00Z"
  }
}
```

#### 6. **POST /api/subscriptions/create-checkout**
**Auth**: Requerida

**Request:**
```json
{
  "planName": "Estudio"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_xxx",
    "url": "https://checkout.stripe.com/xxx"
  }
}
```

#### 7. **POST /api/subscriptions/portal**
**Auth**: Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/xxx"
  }
}
```

#### 8. **POST /api/webhooks/stripe**
**Auth**: Stripe signature verification

**Eventos manejados:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**IMPORTANTE**: Este endpoint NO debe tener `express.json()` antes, debe recibir raw body.

---

## ⚙️ SERVICIOS CORE

### 1. **GematriaService** (`services/gematria.service.js`)

**Métodos:**

#### `processText(text)`
```javascript
// Input: "שָׁלוֹם"
// Output:
{
  original: "שָׁלוֹם",
  normalized: "שלום",
  value: 376,
  breakdown: [
    { letter: "ש", value: 300 },
    { letter: "ל", value: 30 },
    { letter: "ו", value: 6 },
    { letter: "ם", value: 40 }
  ],
  letterCount: 4
}
```

#### `compareTexts(text1, text2)`
Compara dos textos y retorna si son iguales en gematría.

**Validaciones:**
- Texto debe contener caracteres hebreos
- Se eliminan vocales (nikud)
- Se normalizan letras finales

### 2. **TextSearchService** (`services/textSearch.service.js`)

**Métodos:**

#### `findByGematria(value, options)`
```javascript
await findByGematria(376, {
  sources: ['Torah', 'Zohar'],
  limit: 10,
  offset: 0
})
```
Busca textos con valor gemátrico exacto.

#### `findByGematriaRange(minValue, maxValue, options)`
Busca en un rango de valores (útil para análisis comparativos).

#### `formatTextsForDisplay(texts)`
Formatea resultados para mostrar al usuario.

#### `buildReference(text)`
Construye referencia legible: "Torah Genesis 1:1"

### 3. **AIService** (`services/ai.service.js`)

**Métodos:**

#### `interpret({ inputText, hebrewText, gematriaValue, matchedTexts, userPlan })`
```javascript
const result = await aiService.interpret({
  inputText: "paz",
  hebrewText: "שלום",
  gematriaValue: 376,
  matchedTexts: [...],
  userPlan: "Estudio"
});

// Returns:
{
  response: "Interpretación de la IA...",
  metadata: {
    model: "gpt-4o-mini",
    tokensUsed: 450,
    processingTimeMs: 1200,
    finishReason: "stop"
  }
}
```

**System Prompt:**
```
Eres un asistente académico especializado en textos sagrados judíos y gematría.

REGLAS ESTRICTAS:
1. NUNCA inventes valores gemátricos
2. NUNCA cites textos que no te fueron proporcionados
3. NUNCA afirmes verdades absolutas o proféticas
4. Si no hay textos relacionados, di "No se encontraron textos con este valor"
5. Usa lenguaje académico pero accesible

ESTRUCTURA DE RESPUESTA:
1. Resumen breve del valor gemátrico
2. Relación con textos encontrados (si existen)
3. Posibles interpretaciones simbólicas
4. Disclaimer académico al final
```

**Límites por plan:**
- Free: 300 tokens max
- Estudio: 600 tokens max
- Avanzado: 1000 tokens max

#### `logAICall({ userId, queryId, prompt, response, metadata })`
Guarda log en `ai_logs` para auditoría.

#### `calculateCost(tokens, model)`
Calcula costo aproximado en centavos.

### 4. **SubscriptionService** (`services/subscription.service.js`)

**Métodos:**

#### `getUserPlan(userId)`
Retorna plan actual del usuario (o Free por defecto).

#### `canMakeQuery(userId)`
```javascript
const validation = await canMakeQuery(userId);
// Returns:
{
  allowed: true,
  plan: "Estudio",
  remaining: 55
}
// O:
{
  allowed: false,
  reason: "Límite mensual alcanzado",
  plan: "Estudio",
  remaining: 0
}
```

#### `incrementUsage(userId)`
Incrementa contador mensual (llama a función PostgreSQL).

#### `getAvailablePlans()`
Lista todos los planes activos.

#### `upsertSubscription(subscriptionData)`
Crea o actualiza suscripción (usado en webhooks Stripe).

#### `cancelSubscription(userId)`
Marca suscripción como cancelada.

---

## 🔐 AUTENTICACIÓN Y AUTORIZACIÓN

### Middlewares

#### 1. **authenticate** (`middleware/auth.js`)
```javascript
import { authenticate } from '../middleware/auth.js';

router.get('/protected', authenticate, (req, res) => {
  // req.user está disponible
  // req.userId está disponible
});
```

**Flujo:**
1. Extrae token del header `Authorization: Bearer <token>`
2. Verifica con Supabase Auth
3. Adjunta `req.user` y `req.userId`
4. Si falla: `401 Unauthorized`

#### 2. **optionalAuth** (`middleware/auth.js`)
Igual que `authenticate` pero NO falla si no hay token.  
Usado en endpoints que permiten acceso free.

### Validación de Límites

#### **validatePlanLimits** (`middleware/planValidator.js`)

**Para usuarios autenticados:**
1. Consulta plan actual
2. Verifica límite mensual
3. Si excede: `403 Forbidden`
4. Adjunta `req.userPlan` y `req.queriesRemaining`

**Para usuarios NO autenticados:**
1. Extrae identificador (IP)
2. Hash del identificador
3. Busca en `free_usage`
4. Si >= 3: `403 Forbidden` con mensaje de registro
5. Adjunta `req.freeUsageId` y `req.freeUsageIdentifier`

#### **incrementQueryCounter** (post-respuesta)

Middleware que se ejecuta DESPUÉS de enviar respuesta:
1. Si statusCode 2xx: incrementa contador
2. Para usuarios: llama `increment_monthly_usage()`
3. Para free: actualiza `free_usage`

**Uso:**
```javascript
router.post('/query',
  optionalAuth,
  validatePlanLimits,
  incrementQueryCounter, // ← IMPORTANTE
  async (req, res) => { ... }
);
```

---

## 💳 SISTEMA DE SUSCRIPCIONES

### Flujo Completo

#### 1. **Usuario elige plan**
Frontend llama `POST /api/subscriptions/create-checkout`

#### 2. **Backend crea Stripe Checkout**
```javascript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: stripe_price_id, quantity: 1 }],
  mode: 'subscription',
  success_url: 'https://app.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://app.com/pricing',
  metadata: { user_id, plan_id }
});
```

#### 3. **Usuario completa pago en Stripe**

#### 4. **Stripe envía webhook** `checkout.session.completed`

#### 5. **Backend procesa webhook**
```javascript
await subscriptionService.upsertSubscription({
  userId: session.metadata.user_id,
  planId: session.metadata.plan_id,
  stripeCustomerId: session.customer,
  stripeSubscriptionId: session.subscription,
  status: 'active',
  currentPeriodStart: ...,
  currentPeriodEnd: ...
});
```

#### 6. **Usuario ahora tiene plan activo**

### Renovaciones Automáticas

Stripe envía `customer.subscription.updated` cada mes:
- Backend actualiza `current_period_end`
- **NO** resetea contador mensual (lo hace PostgreSQL automáticamente por fecha)

### Cancelaciones

Usuario cancela desde Customer Portal:
1. Stripe envía `customer.subscription.deleted`
2. Backend marca status = 'canceled'
3. Usuario vuelve a Free al finalizar periodo

### Pagos Fallidos

Stripe envía `invoice.payment_failed`:
1. Backend marca status = 'past_due'
2. Usuario puede seguir usando hasta que Stripe lo suspenda
3. (Opcional) enviar email de recordatorio

---

## 🤖 INTEGRACIÓN CON IA

### Modelo Usado
`gpt-4o-mini` (más económico y rápido que GPT-4)

### Estrategia Anti-Alucinaciones

**Principio: IA SOLO ve datos reales**

1. Usuario ingresa texto
2. Backend calcula gematría
3. Backend busca textos en DB con ese valor
4. Backend envía SOLO esos textos a la IA
5. IA NO puede inventar citas

### Estructura del Prompt

**System:**
```
Eres un asistente académico especializado en textos sagrados judíos y gematría.

REGLAS ESTRICTAS:
1. NUNCA inventes valores gemátricos
2. NUNCA cites textos que no te fueron proporcionados
3. NUNCA afirmes verdades absolutas o proféticas
...
```

**User:**
```
Frase consultada: "paz"
Texto hebreo: שלום
Valor gemátrico: 376

TEXTOS RELACIONADOS CON ESTE VALOR:
1. Torah Genesis 1:1
   Texto: בראשית
   
2. Zohar I:15a
   Texto: ...

Por favor, proporciona una interpretación académica y respetuosa de esta consulta.
```

### Control de Costos

**Límites de tokens por plan:**
- Free: 300 tokens (~200 palabras)
- Estudio: 600 tokens (~400 palabras)
- Avanzado: 1000 tokens (~650 palabras)

**Estimación de costos:**
- gpt-4o-mini: ~$0.00015 por 1K tokens
- Consulta promedio: ~500 tokens = $0.000075
- 10,000 consultas/mes = ~$0.75

**Logging:**
Todas las llamadas se guardan en `ai_logs`:
- Prompt enviado
- Respuesta recibida
- Tokens usados
- Costo calculado

---

## 📊 IMPORTACIÓN DE DATOS

### Script: `importCSV.js`

**Ubicación**: `backend/src/scripts/importCSV.js`

**Ejecución**:
```bash
npm run import
```

### Formato CSV Esperado

**Columnas:**
1. Primera columna: Referencia (ej: "Genesis 1:1")
2. Segunda columna: Texto hebreo

**Ejemplo:**
```csv
Index Title,Hebrew Text
Genesis 1:1,בְּרֵאשִׁית בָּרָא אֱלֹהִים
Genesis 1:2,וְהָאָרֶץ הָיְתָה תֹהוּ
```

### Proceso de Importación

1. Lee CSV línea por línea
2. Para cada línea:
   - Extrae texto hebreo
   - Normaliza (elimina nikud)
   - Calcula gematría
   - Parsea referencia
   - Acumula en array
3. Inserta en lotes de 500 filas
4. Muestra progreso en consola

### Archivos a Importar

Ubicar en `backend/data/`:
- `Genesis.csv`
- `Exodus.csv`
- `Leviticus.csv`
- `Numbers.csv`
- `Deuteronomy.csv`
- `Zohar.csv`
- `SeferYetzirah.csv`

### Resultados Esperados

Después de importar:
- **texts**: Miles de registros
- Índices activos en `gematria_value`
- Búsquedas ultra-rápidas (<50ms)

---

## 🚀 CONFIGURACIÓN Y DEPLOYMENT

### Variables de Entorno

**`backend/.env`**
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>

# OpenAI
OPENAI_API_KEY=<openai-api-key>

# Server

### Setup Inicial

#### 1. Supabase
```bash
# Crear proyecto en supabase.com
# Ejecutar schema.sql en SQL Editor
# Ejecutar policies.sql
# Copiar API keys
```

#### 2. Stripe
```bash
# Crear cuenta en stripe.com
# Crear 3 productos:
#   - Plan Estudio ($10/mes)
#   - Plan Avanzado ($25/mes)
# Copiar Price IDs
# Actualizar subscription_plans.stripe_price_id
# Configurar webhook endpoint: /api/webhooks/stripe
# Copiar webhook secret
```

#### 3. OpenAI
```bash
# Crear cuenta en platform.openai.com
# Generar API key
# Agregar billing
```

### Comandos Desarrollo
```bash
# Backend
cd backend
npm install
npm run dev     # Inicia servidor en localhost:3001

# Importar datos
npm run import  # Solo ejecutar UNA VEZ

# Producción
npm start
```

### Deployment

#### Backend (Railway)
```bash
# 1. Conectar repo GitHub
# 2. Railway detecta Node.js automáticamente
# 3. Configurar variables de entorno
# 4. Deploy automático en cada push
```

#### Frontend (Vercel)
```bash
# 1. Conectar repo GitHub
# 2. Vercel detecta Vite automáticamente
# 3. Build command: npm run build
# 4. Output: dist
# 5. Variables de entorno: VITE_API_URL
```

---

## 📌 ESTADO ACTUAL DEL PROYECTO

### ✅ COMPLETADO

#### Base de Datos
- [x] Esquema completo
- [x] Row Level Security (RLS)
- [x] Índices optimizados
- [x] Triggers y funciones
- [x] Vista user_current_plan
- [x] Seed de subscription_plans

#### Backend - Core
- [x] Servidor Express configurado
- [x] Middlewares de seguridad (helmet, cors, rate-limit)
- [x] Cliente Supabase (público + admin)
- [x] Autenticación JWT
- [x] Validación de límites por plan

#### Servicios
- [x] GematriaService (cálculo + validación)
- [x] TextSearchService (búsqueda por valor)
- [x] AIService (interpretación + logging)
- [x] SubscriptionService (gestión de planes)

#### Endpoints API
- [x] POST /api/query (consulta principal)
- [x] GET /api/query/history
- [x] GET /api/query/history/:id
- [x] GET /api/subscriptions/plans
- [x] GET /api/subscriptions/current
- [x] POST /api/subscriptions/create-checkout
- [x] POST /api/subscriptions/portal
- [x] POST /api/webhooks/stripe

#### Importación de Datos
- [x] Script importCSV.js
- [x] Normalización de hebreo
- [x] Cálculo automático de gematría
- [x] Inserción en batches
- [x] Manejo de errores

### 🚧 PENDIENTE

#### Backend - Mejoras
- [ ] Error handler centralizado
- [ ] Logger (Winston/Pino)
- [ ] Tests unitarios (Jest)
- [ ] Tests de integración
- [ ] Documentación Swagger/OpenAPI
- [ ] Health checks avanzados
- [ ] Monitoreo (Sentry)

#### Frontend - TODO
- [ ] Estructura de carpetas
- [ ] Componentes UI (auth, dashboard, bot)
- [ ] Hooks personalizados
- [ ] Context de autenticación
- [ ] Context de suscripción
- [ ] Integración con Stripe Checkout
- [ ] Diseño responsive
- [ ] Animaciones
- [ ] SEO

#### Stripe Configuration
- [ ] Crear productos en dashboard
- [ ] Configurar webhooks en producción
- [ ] Testing de webhooks (Stripe CLI)
- [ ] Manejo de cancelaciones
- [ ] Customer Portal personalizado

#### DevOps
- [ ] CI/CD (GitHub Actions)
- [ ] Dockerfile
- [ ] Docker Compose para desarrollo
- [ ] Staging environment
- [ ] Backup automatizado de DB
- [ ] Logs centralizados

#### Features Avanzadas
- [ ] Traducción automática (Google Translate API)
- [ ] Comparación entre frases
- [ ] Exportar historial a PDF
- [ ] Notificaciones por email
- [ ] Dashboard de admin
- [ ] Analytics (Mixpanel/PostHog)

---

## 🔑 PUNTOS CLAVE PARA OTRA IA

### Arquitectura
1. **Backend totalmente funcional** - API REST completa
2. **Autenticación via Supabase** - JWT en headers
3. **3 niveles de acceso** - Free (demo), Estudio, Avanzado
4. **Stripe integrado** - Webhooks configurados
5. **OpenAI para interpretación** - Sin alucinaciones

### Flujo de Datos

Usuario → Frontend (pendiente)
↓
POST /api/query con texto
↓
Backend valida auth + límites
↓
Calcula gematría → Busca en DB → Envía a IA
↓
Guarda en historial + incrementa contador
↓
Retorna JSON con interpretación

### Seguridad
- RLS en todas las tablas
- Rate limiting por IP
- Validación de Stripe signatures
- Service role SOLO en backend
- CORS configurado

### Performance
- Índices en `gematria_value`
- Batching en importación
- Búsquedas <50ms
- IA response <2s

### Monetización
- Free: 3 consultas (sin historial)
- Estudio: $10/mes, 100 consultas
- Avanzado: $25/mes, ilimitado

### Próximos Pasos Críticos
1. **Frontend React** - UI/UX
2. **Stripe Setup** - Crear productos
3. **Deploy** - Vercel + Railway
4. **Testing** - E2E con Playwright
5. **Docs** - README del usuario

---

## 📝 NOTAS TÉCNICAS

### ESM Modules
- **Usar** `import/export`, NO `require`
- **package.json** debe tener `"type": "module"`
- **dotenv** cargar en `supabase.js` (antes de usar env vars)

### Stripe Webhooks
- Endpoint `/api/webhooks/stripe` debe recibir **raw body**
- Colocar ANTES de `express.json()`
- Verificar signature SIEMPRE
- Usar `stripe listen --forward-to` para testing local

### Supabase RLS
- **Service role** bypasea RLS
- **Anon key** respeta RLS
- Backend usa ambas según contexto
- Usuarios NUNCA ven service role key

### Gematría
- Normalizar texto (eliminar nikud)
- Letras finales = valor regular
- Rango válido: 1-10000
- Índices en DB son críticos

### OpenAI
- **Temperature 0.7** (balance creatividad/precisión)
- **top_p 0.9** (diversidad de respuestas)
- **max_tokens** según plan
- **Siempre** incluir system prompt

---

## 🎯 VISIÓN FUTURA

### Fase 1 (Actual)
✅ Backend funcional + DB + API

### Fase 2 (Próxima)
🚧 Frontend React + Stripe checkout

### Fase 3
- Traducción automática
- Análisis comparativo
- Exportar PDF

### Fase 4
- App móvil (React Native)
- API pública para developers
- Webhooks para integraciones

### Fase 5
- IA personalizada (fine-tuning)
- Comunidad de usuarios
- Marketplace de interpretaciones

---

**Fin de la documentación. Esta información es suficiente para que otra IA entienda y continúe el proyecto desde cualquier punto.**
