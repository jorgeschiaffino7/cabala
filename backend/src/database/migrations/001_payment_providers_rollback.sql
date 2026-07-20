-- ============================================================================
-- ROLLBACK 001: Revertir Soporte Multi-Proveedor de Pagos
-- ============================================================================
-- ADVERTENCIA: Este script elimina las nuevas columnas y tablas.
--              Los datos en esas columnas se perderán.
-- ============================================================================

-- Paso 1: Eliminar vista actualizada
DROP VIEW IF EXISTS user_current_plan;

-- Paso 2: Eliminar función helper
DROP FUNCTION IF EXISTS get_plan_provider_id(UUID, payment_provider);

-- Paso 3: Eliminar políticas RLS de payment_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON payment_transactions;

-- Paso 4: Eliminar tabla payment_transactions
DROP TABLE IF EXISTS payment_transactions;

-- Paso 5: Eliminar índices de subscriptions
DROP INDEX IF EXISTS idx_subscriptions_provider;
DROP INDEX IF EXISTS idx_subscriptions_provider_subscription;

-- Paso 6: Eliminar columnas de subscriptions
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS payment_provider,
DROP COLUMN IF EXISTS provider_customer_id,
DROP COLUMN IF EXISTS provider_subscription_id,
DROP COLUMN IF EXISTS mercadopago_preapproval_id,
DROP COLUMN IF EXISTS mercadopago_payer_id,
DROP COLUMN IF EXISTS paypal_subscription_id,
DROP COLUMN IF EXISTS paypal_payer_id;

-- Paso 7: Eliminar columnas de subscription_plans
ALTER TABLE subscription_plans 
DROP COLUMN IF EXISTS mercadopago_plan_id,
DROP COLUMN IF EXISTS paypal_plan_id;

-- Paso 8: Eliminar tipo ENUM
DROP TYPE IF EXISTS payment_provider;

-- Paso 9: Recrear vista original
CREATE VIEW user_current_plan AS
SELECT 
    u.id as user_id,
    u.email,
    p.full_name,
    COALESCE(sp.name, 'Free') as plan_name,
    COALESCE(sp.monthly_queries, 3) as monthly_queries,
    s.status as subscription_status,
    s.current_period_end,
    COALESCE(ut.queries_count, 0) as queries_this_month
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id 
    AND ut.month = DATE_TRUNC('month', NOW())::DATE;

-- ============================================================================
-- ROLLBACK COMPLETADO
-- ============================================================================
