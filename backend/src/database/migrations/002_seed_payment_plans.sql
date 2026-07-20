-- ============================================================================
-- SEED 002: Actualizar Planes con IDs de Proveedores
-- ============================================================================
-- Ejecutar DESPUÉS de configurar los productos en Mercado Pago y PayPal
-- Reemplazar los valores NULL con los IDs reales de cada proveedor
-- ============================================================================

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Crear productos en Mercado Pago (Panel de desarrollador > Suscripciones)
-- 2. Crear productos en PayPal (Dashboard > Products & Subscriptions)
-- 3. Reemplazar los NULL con los IDs generados
-- 4. Ejecutar este script
-- ============================================================================

-- Plan Estudio ($10/mes)
UPDATE subscription_plans
SET 
    mercadopago_plan_id = NULL,  -- Reemplazar: '2c938084XXXXXXXX' (preapproval_plan_id)
    paypal_plan_id = NULL        -- Reemplazar: 'P-XXXXXXXXXXXXXXXX' (PayPal Plan ID)
WHERE name = 'Estudio';

-- Plan Avanzado ($25/mes)
UPDATE subscription_plans
SET 
    mercadopago_plan_id = NULL,  -- Reemplazar: '2c938084YYYYYYYY' (preapproval_plan_id)
    paypal_plan_id = NULL        -- Reemplazar: 'P-YYYYYYYYYYYYYYYY' (PayPal Plan ID)
WHERE name = 'Avanzado';

-- ============================================================================
-- VERIFICAR ACTUALIZACIÓN
-- ============================================================================

SELECT 
    name,
    price_cents,
    monthly_queries,
    stripe_price_id,
    mercadopago_plan_id,
    paypal_plan_id,
    is_active
FROM subscription_plans
ORDER BY price_cents;

-- ============================================================================
-- NOTAS DE CONFIGURACIÓN
-- ============================================================================
-- 
-- MERCADO PAGO:
-- 1. Ir a https://www.mercadopago.com.ar/developers/panel/app
-- 2. Crear aplicación si no existe
-- 3. Ir a Suscripciones > Crear plan
-- 4. Configurar:
--    - Nombre: "Gematria Bot - Estudio" / "Gematria Bot - Avanzado"
--    - Frecuencia: Mensual
--    - Monto: $10 / $25 (en moneda local)
-- 5. Copiar el preapproval_plan_id generado
--
-- PAYPAL:
-- 1. Ir a https://developer.paypal.com/dashboard/
-- 2. Crear aplicación si no existe
-- 3. Ir a Products & Subscriptions
-- 4. Crear producto: "Gematria Bot"
-- 5. Crear planes para el producto:
--    - "Estudio Plan" - $10/mes USD
--    - "Avanzado Plan" - $25/mes USD
-- 6. Copiar el Plan ID (P-XXXXX)
--
-- ============================================================================
