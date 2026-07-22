# Guía de implementación: Mercado Pago y PayPal

Esta guía describe cómo activar los pagos por suscripción en **Gematria Bot**. El código de backend, frontend y base de datos ya está implementado; lo que falta es la **configuración operativa** en cada proveedor y en Supabase.

---

## Estado actual del código

### Listo para usar

| Capa | Qué incluye |
|------|-------------|
| **Backend** | `MercadoPagoService`, `PayPalService`, `PaymentRouter`, rutas de suscripción y webhooks |
| **Frontend** | Página de pricing, selector MP/PayPal, redirect al checkout, gestión en Settings |
| **Base de datos** | Migraciones multi-proveedor, tabla `payment_transactions`, vista `user_current_plan` |
| **Dependencias** | `mercadopago` y `@paypal/paypal-server-sdk` instalados |

### Bloqueos actuales (configuración, no código)

1. **IDs de planes en NULL** — Sin `mercadopago_plan_id` / `paypal_plan_id` en Supabase, el checkout responde: *"Plan no configurado para {provider}"*.
2. **Credenciales vacías** — Hay que completar las variables en `.env` (backend) y en Railway/producción.
3. **Webhooks no registrados** — Los proveedores deben apuntar a las URLs del backend.
4. **Verificación PayPal incompleta** — Si `PAYPAL_WEBHOOK_ID` está vacío, los webhooks se aceptan sin verificar firma (aceptable solo en desarrollo).

### Detalles menores (no bloquean el MVP)

- `PAYMENT_SUCCESS_URL`, `PAYMENT_CANCEL_URL` y `PAYMENT_PENDING_URL` están en `.env.example` pero el código usa `FRONTEND_URL` directamente.
- Stripe está desactivado (código legacy conservado).
- No hay UI para historial de transacciones (la API sí existe).
- La página de pricing no muestra mensaje cuando el usuario cancela el pago (`?payment=cancelled`).

---

## Arquitectura del flujo

```
Usuario → /pricing → elige plan → elige MP o PayPal
    → POST /api/subscriptions/create-checkout
    → redirect al checkout del proveedor
    → usuario paga
    → webhook → backend actualiza Supabase
    → redirect a /dashboard?payment=success
```

**Enrutamiento por país:**

- **Mercado Pago:** AR, BR, CL, CO, MX, PE, UY
- **PayPal:** resto del mundo

**Planes de pago:**

| Plan | Precio | Consultas/mes |
|------|--------|---------------|
| Estudio | $10/mes | según BD |
| Avanzado | $25/mes | ilimitado |

---

## Paso 1: Base de datos (Supabase)

### 1.1 Ejecutar migraciones

En el **SQL Editor** de Supabase, ejecutar en orden:

1. `backend/src/database/migrations/001_payment_providers_migration.sql`
2. `backend/src/database/migrations/003_fix_user_current_plan_monthly_queries.sql` *(si aplica)*

Ver guía detallada en [`backend/src/database/PAYMENT_MIGRATION.md`](backend/src/database/PAYMENT_MIGRATION.md).

### 1.2 Verificar tablas

```sql
SELECT name, price_cents, mercadopago_plan_id, paypal_plan_id
FROM subscription_plans
ORDER BY price_cents;
```

Deberías ver los planes **Estudio** y **Avanzado** con IDs en `NULL` hasta completar el paso 2.

---

## Paso 2: Crear planes vía API (recomendado)

El proyecto incluye un script que crea los planes en Mercado Pago y PayPal leyendo los precios desde Supabase, y guarda los IDs automáticamente.

### 2.1 Obtener credenciales

**Mercado Pago** — [Panel de desarrolladores](https://www.mercadopago.com/developers/panel/app):
- `MERCADOPAGO_ACCESS_TOKEN` (credenciales de prueba o producción)
- `MERCADOPAGO_CURRENCY_ID` — moneda local del plan (default: `ARS`)

**PayPal** — [Developer Dashboard](https://developer.paypal.com/dashboard/applications):
- `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`
- `PAYPAL_MODE=sandbox` (pruebas) o `live` (producción)
- `PAYPAL_CURRENCY_CODE=USD` (default)

Completar también `FRONTEND_URL` y las variables de Supabase en `backend/.env`.

### 2.2 Ejecutar el script

```bash
cd backend

# Vista previa sin llamar APIs ni escribir en BD
npm run setup-plans -- --dry-run

# Crear planes en ambos proveedores y actualizar Supabase
npm run setup-plans

# Solo un proveedor
npm run setup-plans -- --provider=mercadopago
npm run setup-plans -- --provider=paypal

# Recrear planes aunque ya tengan ID (cuidado: crea planes duplicados en MP/PayPal)
npm run setup-plans -- --force
```

**Qué hace el script** (`backend/src/scripts/setupPaymentPlans.js`):

| Proveedor | Acción |
|-----------|--------|
| Mercado Pago | `POST /preapproval_plan` por cada plan de pago → guarda `mercadopago_plan_id` |
| PayPal | Crea producto "Gematria Bot" (si no existe `PAYPAL_PRODUCT_ID`) → crea billing plan mensual → activa → guarda `paypal_plan_id` |

Al terminar muestra un resumen:

```
Estudio: MP=2c938084... | PayPal=P-XXXX...
Avanzado: MP=2c938084... | PayPal=P-YYYY...
```

### 2.3 Verificar en Supabase

```sql
SELECT name, price_cents, mercadopago_plan_id, paypal_plan_id
FROM subscription_plans
WHERE price_cents > 0;
```

### Alternativa: crear planes manualmente en el panel

Si preferís no usar el script:

<details>
<summary>Mercado Pago (panel)</summary>

1. Panel MP → **Suscripciones** → **Planes de suscripción**
2. Crear **Estudio** ($10/mes) y **Avanzado** ($25/mes)
3. Copiar cada `preapproval_plan_id` y ejecutar el UPDATE de `002_seed_payment_plans.sql`

</details>

<details>
<summary>PayPal (panel)</summary>

1. Dashboard → **Products & Subscriptions**
2. Crear producto **Gematria Bot** y dos planes mensuales ($10 y $25 USD)
3. Copiar cada Plan ID (`P-XXXXX`) y ejecutar el UPDATE de `002_seed_payment_plans.sql`

</details>

---

## Paso 3: Configurar webhooks

### 3.1 Mercado Pago

1. En el panel de MP → tu aplicación → **Webhooks** / **Notificaciones IPN**.
2. URL de notificación:

   ```
   https://TU-BACKEND/api/webhooks/mercadopago
   ```

   En producción actual (Vercel proxy → Railway):

   ```
   https://TU-DOMINIO-FRONTEND/api/webhooks/mercadopago
   ```

   El proxy de `frontend/vercel.json` reenvía `/api/*` al backend en Railway.

3. Suscribir eventos relevantes:
   - `subscription_preapproval`
   - `subscription_authorized_payment`

4. Si MP proporciona un **secret** para firmas, copiarlo a `MERCADOPAGO_WEBHOOK_SECRET`.

### 3.2 PayPal

1. En PayPal Developer → tu app → **Webhooks** → **Add Webhook**.
2. URL:

   ```
   https://TU-BACKEND/api/webhooks/paypal
   ```

   O vía proxy Vercel:

   ```
   https://TU-DOMINIO-FRONTEND/api/webhooks/paypal
   ```

3. Suscribir eventos:

   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.RE-ACTIVATED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`

4. Copiar el **Webhook ID** generado → `PAYPAL_WEBHOOK_ID`.

---

## Paso 4: Variables de entorno

### Backend (`.env` local / Railway)

Copiar `backend/.env.example` a `backend/.env` y completar:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_CURRENCY_ID=ARS
MERCADOPAGO_WEBHOOK_SECRET=          # recomendado en producción
MERCADOPAGO_SUPPORTED_COUNTRIES=AR,BR,CL,CO,MX,PE,UY

# PayPal
PAYPAL_CLIENT_ID=A...
PAYPAL_CLIENT_SECRET=E...
PAYPAL_MODE=sandbox                  # cambiar a 'live' en producción
PAYPAL_CURRENCY_CODE=USD
PAYPAL_PRODUCT_ID=                   # opcional; lo crea setup-plans si falta
PAYPAL_WEBHOOK_ID=                   # ID del webhook creado en PayPal

# URLs
FRONTEND_URL=http://localhost:5173   # en prod: https://tu-dominio.com
BACKEND_URL=http://localhost:3001    # en prod: URL directa de Railway
```

### Frontend

No requiere variables de pago. Solo:

```env
VITE_API_URL=http://localhost:3001   # en prod suele ir vacío (proxy Vercel)
```

### Railway (producción)

Agregar las mismas variables de Mercado Pago y PayPal en el servicio del backend. Asegurarse de que `FRONTEND_URL` apunte al dominio real de Vercel.

---

## Paso 5: Probar la integración

### 5.1 Desarrollo local

1. Levantar backend y frontend:

   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. Para webhooks en local, usar un túnel (ngrok, Cloudflare Tunnel, etc.):

   ```
   https://abc123.ngrok.io/api/webhooks/mercadopago
   https://abc123.ngrok.io/api/webhooks/paypal
   ```

3. Registrar esas URLs en los paneles de MP y PayPal.

### 5.2 Flujo de prueba manual

1. Iniciar sesión en la app.
2. Ir a `/pricing`.
3. Elegir plan **Estudio** o **Avanzado**.
4. Seleccionar **Mercado Pago** o **PayPal**.
5. Completar el pago en el checkout externo.
6. Verificar:
   - Redirect a `/dashboard?payment=success`
   - En Supabase: fila en `subscriptions` con `payment_provider` correcto
   - En Supabase: registro en `payment_transactions`
   - Límites de consulta actualizados según el plan

### 5.3 Cuentas de prueba

| Proveedor | Dónde obtener cuentas sandbox |
|-----------|--------------------------------|
| Mercado Pago | Panel de desarrolladores → Usuarios de prueba |
| PayPal | Developer Dashboard → Sandbox → Accounts |

### 5.4 Endpoints útiles para depuración

| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/subscriptions/plans` | No |
| GET | `/api/subscriptions/providers?country=AR` | No |
| GET | `/api/subscriptions/current` | Sí |
| POST | `/api/subscriptions/create-checkout` | Sí |
| POST | `/api/webhooks/mercadopago` | No (MP) |
| POST | `/api/webhooks/paypal` | No (PayPal) |

---

## Paso 6: Checklist de producción

- [ ] Migraciones SQL ejecutadas en Supabase
- [ ] Planes creados con `npm run setup-plans` (o IDs manuales en Supabase)
- [ ] Credenciales de **producción** de MP configuradas en Railway
- [ ] Credenciales de **live** de PayPal configuradas (`PAYPAL_MODE=live`)
- [ ] `FRONTEND_URL` apunta al dominio de producción
- [ ] Webhooks registrados en MP y PayPal con URLs accesibles
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` configurado
- [ ] `PAYPAL_WEBHOOK_ID` configurado
- [ ] Prueba end-to-end con pago real o sandbox en entorno staging
- [ ] Verificar cancelación / pausa / reanudación desde `/settings`

---

## Referencia de archivos del proyecto

```
backend/
├── .env.example                          # Variables requeridas
├── src/
│   ├── scripts/
│   │   └── setupPaymentPlans.js          # Crear planes MP/PayPal vía API
│   ├── config/
│   │   ├── mercadopago.js
│   │   └── paypal.js
│   ├── services/payment/
│   │   ├── MercadoPagoService.js         # Checkout + preapproval
│   │   ├── PayPalService.js              # Checkout + subscriptions
│   │   ├── PaymentRouter.js              # Enrutamiento por país
│   │   └── PaymentGateway.js             # Interfaz común
│   ├── routes/
│   │   ├── subscription.routes.js        # API de suscripciones
│   │   ├── mercadopago.webhook.routes.js
│   │   └── paypal.webhook.routes.js
│   └── database/migrations/
│       ├── 001_payment_providers_migration.sql
│       └── 002_seed_payment_plans.sql

frontend/
├── src/
│   ├── pages/PricingPage.tsx
│   ├── pages/DashboardPage.tsx           # Maneja ?payment=success
│   ├── pages/SettingsPage.tsx            # Cancel / pause / resume
│   └── components/payment/PaymentMethodSelector.tsx
└── vercel.json                           # Proxy /api → Railway
```

---

## Solución de problemas

| Error | Causa probable | Solución |
|-------|----------------|----------|
| *Plan no configurado para mercadopago/paypal* | IDs NULL en `subscription_plans` | Ejecutar `npm run setup-plans` |
| Checkout no redirige / error 500 | Token o credenciales inválidas | Verificar `MERCADOPAGO_ACCESS_TOKEN` / `PAYPAL_CLIENT_ID` y `SECRET` |
| Pago OK pero plan no se activa | Webhook no llega o falla | Revisar URL del webhook, logs de Railway, tabla `payment_transactions` |
| Webhook 401 | Firma inválida | Verificar `MERCADOPAGO_WEBHOOK_SECRET` o `PAYPAL_WEBHOOK_ID` |
| PayPal sandbox no funciona | Modo incorrecto | Confirmar `PAYPAL_MODE=sandbox` con credenciales sandbox |

---

## Próximos pasos opcionales (mejoras de código)

Estas tareas no son necesarias para lanzar, pero conviene planificarlas:

1. Completar verificación real de firma en `PayPalService.verifyWebhookSignature()`.
2. Mostrar mensaje en pricing cuando `?payment=cancelled`.
3. UI de historial de transacciones (`GET /api/subscriptions/transactions`).
4. Usar `PAYMENT_*_URL` del `.env` en lugar de hardcodear URLs en `subscription.routes.js`.
5. Tests automatizados de webhooks y checkout.
