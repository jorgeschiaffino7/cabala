# 💳 Migración de Pagos: Multi-Proveedor

## Resumen
Esta migración añade soporte para múltiples proveedores de pago:
- **Mercado Pago** → Latinoamérica (AR, BR, CL, CO, MX, PE, UY)
- **PayPal** → Resto del mundo
- **Stripe** → Desactivado (código mantenido para futura reactivación)

---

## 📂 Archivos Creados/Modificados

### Nuevos Archivos
| Archivo | Descripción |
|---------|-------------|
| `migrations/001_payment_providers_migration.sql` | Migración principal de BD |
| `migrations/001_payment_providers_rollback.sql` | Script de rollback |
| `migrations/002_seed_payment_plans.sql` | Actualizar IDs de planes |
| `.env.example` | Variables de entorno actualizadas |

### Archivos Modificados
| Archivo | Cambios |
|---------|---------|
| `services/subscription.service.js` | Soporte multi-proveedor |

---

## 🗄️ Cambios en Base de Datos

### Tabla: `subscription_plans`
```diff
+ mercadopago_plan_id TEXT
+ paypal_plan_id TEXT
```

### Tabla: `subscriptions`
```diff
+ payment_provider ENUM('mercadopago', 'paypal', 'stripe', 'none')
+ provider_customer_id TEXT
+ provider_subscription_id TEXT
+ mercadopago_preapproval_id TEXT
+ mercadopago_payer_id TEXT
+ paypal_subscription_id TEXT
+ paypal_payer_id TEXT
```

### Nueva Tabla: `payment_transactions`
Log unificado de todas las transacciones de pago.

### Vista Actualizada: `user_current_plan`
Incluye `payment_provider` del usuario.

### Nueva Función: `get_plan_provider_id(plan_id, provider)`
Retorna el ID del plan en el proveedor especificado.

---

## 🚀 Instrucciones de Ejecución

### Paso 1: Ejecutar Migración
```bash
# Opción A: Desde Supabase SQL Editor
# Copiar y pegar contenido de 001_payment_providers_migration.sql

# Opción B: Desde CLI (si tienes acceso directo)
psql -h [host] -U [user] -d [database] -f migrations/001_payment_providers_migration.sql
```

### Paso 2: Verificar Migración
```sql
-- Verificar nuevas columnas en subscription_plans
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subscription_plans';

-- Verificar nuevas columnas en subscriptions
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subscriptions';

-- Verificar nueva tabla
SELECT * FROM payment_transactions LIMIT 1;

-- Verificar vista actualizada
SELECT * FROM user_current_plan LIMIT 1;
```

### Paso 3: Configurar Proveedores
1. Crear productos en Mercado Pago y PayPal
2. Actualizar `002_seed_payment_plans.sql` con los IDs reales
3. Ejecutar el script de seed

### Paso 4: Actualizar Variables de Entorno
Copiar valores de `.env.example` a `.env` y completar credenciales.

---

## 🔄 Rollback (Si es necesario)
```bash
psql -h [host] -U [user] -d [database] -f migrations/001_payment_providers_rollback.sql
```

⚠️ **ADVERTENCIA**: El rollback elimina datos de las nuevas columnas.

---

## ✅ Checklist Post-Migración

- [ ] Migración SQL ejecutada sin errores
- [ ] Nuevas columnas visibles en las tablas
- [ ] Tabla `payment_transactions` creada
- [ ] Vista `user_current_plan` actualizada
- [ ] Variables de entorno configuradas
- [ ] Productos creados en Mercado Pago
- [ ] Productos creados en PayPal
- [ ] IDs de planes actualizados en BD

---

## 📋 Próximos Pasos (Fase 2+)

1. Implementar `MercadoPagoService`
2. Implementar `PayPalService`
3. Crear webhooks para cada proveedor
4. Actualizar rutas de suscripción
5. Adaptar frontend para selección de proveedor
