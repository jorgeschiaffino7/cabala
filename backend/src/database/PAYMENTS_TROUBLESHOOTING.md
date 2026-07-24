# Troubleshooting: Integración de Pagos (MP + PayPal)

Documento técnico con los problemas encontrados durante la implementación y sus soluciones.

---

## 1. Variables de entorno no cargadas en ES Modules

### Problema
```
Error: Unauthorized access to resource (MercadoPago)
Error: invalid_client (PayPal)
```

El script `setupPaymentPlans.js` fallaba porque `dotenv.config()` se ejecutaba **después** de los imports en ES Modules.

```javascript
import dotenv from 'dotenv';
dotenv.config(); // ← Se ejecuta DESPUÉS de los imports

import mercadopagoConfig from '../config/mercadopago.js'; // ← Ya se ejecutó con env vacío
```

### Solución
Crear las configuraciones de SDK **dentro de funciones** que se llaman después de `dotenv.config()`:

```javascript
function createMercadoPagoConfig() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
  });
}

// Usar después de dotenv.config()
const config = createMercadoPagoConfig();
```

---

## 2. Monto mínimo de Mercado Pago

### Problema
```
Error: Cannot pay an amount lower than $ 15.00
```

Los planes estaban en USD ($10/$25) pero MP Argentina requiere mínimo $15 ARS.

### Solución
Agregar variables de entorno para precios locales de MP:

```env
MERCADOPAGO_CURRENCY_ID=ARS
MERCADOPAGO_PRICE_ESTUDIO=15000
MERCADOPAGO_PRICE_AVANZADO=37500
```

Y en el script de setup, usar esos precios para MP mientras PayPal usa los de la BD (USD).

---

## 3. `card_token_id is required` en Mercado Pago

### Problema
```
Error: card_token_id is required
```

El SDK de MP intentaba crear una suscripción directa que requiere token de tarjeta, pero nosotros queríamos redirect al checkout de MP.

### Solución
Usar el `init_point` del plan directamente (la URL de checkout que MP genera al crear el plan):

```javascript
async createCheckoutSession({ providerPlanId, ... }) {
  // Obtener el plan para conseguir su init_point
  const response = await fetch(`https://api.mercadopago.com/preapproval_plan/${providerPlanId}`, {
    headers: { 'Authorization': `Bearer ${this.accessToken}` }
  });
  
  const planData = await response.json();
  
  return {
    checkoutUrl: planData.init_point  // URL de checkout de MP
  };
}
```

---

## 4. URL con parámetros rechazada por MP

### Problema
```
GET https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=...&external_reference=... 
400 (Bad Request)
```

Intentamos agregar `external_reference` y `payer_email` como query params al `init_point`, pero MP los rechaza.

### Solución
Usar el `init_point` **tal cual** sin modificarlo:

```javascript
return {
  checkoutUrl: planData.init_point  // Sin agregar params
};
```

El tracking del usuario se hace por email cuando llega el webhook.

---

## 5. Tracking de usuario sin `external_reference`

### Problema
Sin `external_reference` en la URL, cuando llega el webhook no sabemos qué usuario de nuestra app completó el pago.

### Solución
Buscar el usuario por el `payer_email` que MP envía en el webhook:

```javascript
async function handlePreapprovalEvent(preapprovalId) {
  const subscription = await MercadoPagoService.getSubscription(preapprovalId);
  
  let userId = subscription.userId; // De external_reference (si existe)
  
  // Si no hay userId, buscar por email
  if (!userId && subscription.payerEmail) {
    const { data: userPlan } = await supabaseAdmin
      .from('user_current_plan')
      .select('user_id')
      .eq('email', subscription.payerEmail)
      .single();
    
    if (userPlan) {
      userId = userPlan.user_id;
    }
  }
  
  // Continuar con userId...
}
```

**Requisito:** El usuario debe registrarse con el mismo email que usa para pagar en MP.

---

## 6. Métodos incorrectos del SDK de PayPal

### Problema
```
Error: subscriptionsCreate is not a function
```

El SDK `@paypal/paypal-server-sdk` usa nombres de métodos diferentes a los esperados.

### Solución
Corregir los nombres de métodos:

| Incorrecto | Correcto |
|------------|----------|
| `subscriptionsCreate` | `createSubscription` |
| `subscriptionsGet` | `getSubscription` |
| `subscriptionsCancel` | `cancelSubscription` |
| `subscriptionsSuspend` | `suspendSubscription` |
| `subscriptionsActivate` | `activateSubscription` |

Y usar camelCase en el body:

```javascript
// Antes (incorrecto)
{ plan_id, subscriber: { email_address }, custom_id, application_context: { return_url } }

// Después (correcto)
{ planId, subscriber: { emailAddress }, customId, applicationContext: { returnUrl } }
```

---

## 7. `INVALID_PARAMETER_SYNTAX` en PayPal por placeholder de Stripe

### Problema
```
INVALID_PARAMETER_SYNTAX
field: '/application_context/return_url'
value: 'https://example.com/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}'
```

La `return_url` contenía `{CHECKOUT_SESSION_ID}`, un placeholder de **Stripe** que PayPal no reconoce y rechaza por tener llaves `{}`.

### Solución
Eliminar el placeholder de la URL de retorno:

```javascript
// Antes (incorrecto - placeholder de Stripe)
const successUrl = `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;

// Después (correcto)
const successUrl = `${baseUrl}/dashboard?payment=success`;
```

**Archivo:** `subscription.routes.js`

---

## 8. Planes no configurados en producción

### Problema
```
Error: Plan no configurado para mercadopago. Contacta al soporte.
```

El script `setup-plans` se ejecutó con Supabase local/dev, entonces los IDs de planes se guardaron ahí, no en producción.

### Solución
Ejecutar el script con credenciales de **producción** en `.env`:

```env
SUPABASE_URL=<url de producción>
SUPABASE_SERVICE_ROLE_KEY=<key de producción>
MERCADOPAGO_ACCESS_TOKEN=<token de producción>
```

```bash
npm run setup-plans -- --provider=mercadopago
```

---

## 9. Warning de `trust proxy` en Express

### Problema (no crítico)
```
ValidationError: The 'X-Forwarded-For' header is set but Express 'trust proxy' is false
```

Railway usa un proxy, pero Express no está configurado para confiar en él.

### Solución (opcional)
En `server.js`:

```javascript
app.set('trust proxy', 1);
```

---

## 10. Precios diferentes por país en frontend

### Problema
El frontend mostraba precios en USD pero Argentina paga en ARS.

### Solución
Crear función `formatPriceForCountry` que muestra precios locales según el país detectado:

```typescript
const LOCAL_PRICES = {
  AR: { currency: 'ARS', locale: 'es-AR', prices: { Estudio: 15000, Avanzado: 37500 } }
};

export const formatPriceForCountry = (planName, priceCentsUSD, countryCode) => {
  const localConfig = countryCode ? LOCAL_PRICES[countryCode] : null;
  
  if (localConfig?.prices[planName]) {
    return new Intl.NumberFormat(localConfig.locale, {
      style: 'currency',
      currency: localConfig.currency
    }).format(localConfig.prices[planName]);
  }
  
  return formatCurrency(priceCentsUSD); // USD por defecto
};
```

---

## 11. Cancelación y Downgrade de suscripciones

### Funcionalidad implementada

Los usuarios pueden gestionar su suscripción desde la página de Settings:

| Acción | Endpoint | Descripción |
|--------|----------|-------------|
| Cancelar | `POST /api/subscriptions/cancel` | Cancela la suscripción en el proveedor y en BD |
| Pausar | `POST /api/subscriptions/pause` | Pausa temporalmente (solo PayPal) |
| Reanudar | `POST /api/subscriptions/resume` | Reactiva una suscripción pausada |
| Downgrade | `POST /api/subscriptions/downgrade` | Cambia a plan Free |

### Flujo de Downgrade

1. Usuario hace clic en "Cambiar a Free"
2. Se muestra modal de confirmación
3. Backend cancela la suscripción en MP/PayPal
4. Se actualiza el estado en Supabase a `canceled`
5. Se registra la transacción con tipo `downgrade`

### Notas importantes

- **Mercado Pago**: Soporta cancel y pause/resume
- **PayPal**: Soporta cancel, pause (suspend) y resume (activate)
- El downgrade es efectivo inmediatamente (no espera fin de periodo)
- Para downgrade de Avanzado → Estudio, se redirige al checkout de Estudio

---

## Checklist de deploy

- [ ] Variables de MP/PayPal en Railway
- [ ] `FRONTEND_URL` apunta al dominio de producción
- [ ] Migraciones SQL ejecutadas en Supabase prod
- [ ] `npm run setup-plans` ejecutado con credenciales de prod
- [ ] Webhooks configurados en paneles de MP y PayPal
- [ ] `PAYPAL_WEBHOOK_ID` configurado
- [ ] Usuarios se registran con el mismo email que usan para pagar

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `MercadoPagoService.js` | Usa API REST para obtener `init_point` del plan |
| `PayPalService.js` | Nombres de métodos y propiedades corregidos |
| `mercadopago.webhook.routes.js` | Busca usuario por email si no hay `external_reference` |
| `setupPaymentPlans.js` | Crea configs después de `dotenv.config()` |
| `subscription.routes.js` | Removido placeholder, agregado endpoint `/downgrade` |
| `subscription.service.ts` (frontend) | Agregado método `downgradeToFree` |
| `SubscriptionContext.tsx` | Agregado `downgradeToFree` al contexto |
| `SettingsPage.tsx` | UI mejorada con modales de confirmación y opciones de downgrade |
| `formatters.ts` (frontend) | `formatPriceForCountry` para precios locales |
| `PricingPage.tsx` | Usa `userCountry` para mostrar precio correcto |
