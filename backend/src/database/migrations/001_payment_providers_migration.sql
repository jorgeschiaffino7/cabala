-- ============================================================================
-- MIGRACIÓN 001: Soporte Multi-Proveedor de Pagos
-- Mercado Pago (LATAM) + PayPal (Global) - Stripe desactivado
-- ============================================================================
-- Fecha: 2026-02-17
-- Descripción: Modifica las tablas de suscripciones para soportar múltiples
--              proveedores de pago (Mercado Pago, PayPal) manteniendo
--              compatibilidad con Stripe para futura reactivación.
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear ENUM para proveedores de pago
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE payment_provider AS ENUM ('mercadopago', 'paypal', 'stripe', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PASO 2: Modificar tabla subscription_plans
-- ============================================================================

-- Añadir campos para cada proveedor de pago
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS mercadopago_plan_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'ID del precio en Stripe (desactivado temporalmente)';
COMMENT ON COLUMN subscription_plans.mercadopago_plan_id IS 'ID del plan de suscripción en Mercado Pago';
COMMENT ON COLUMN subscription_plans.paypal_plan_id IS 'ID del plan de suscripción en PayPal';

-- ============================================================================
-- PASO 3: Modificar tabla subscriptions
-- ============================================================================

-- Añadir columna de proveedor de pago
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_provider payment_provider DEFAULT 'none';

-- Añadir campos genéricos para cualquier proveedor
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;

-- Añadir campos específicos de Mercado Pago
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS mercadopago_preapproval_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payer_id TEXT;

-- Añadir campos específicos de PayPal
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN subscriptions.payment_provider IS 'Proveedor de pago utilizado: mercadopago, paypal, stripe, none';
COMMENT ON COLUMN subscriptions.provider_customer_id IS 'ID genérico del cliente en el proveedor de pago';
COMMENT ON COLUMN subscriptions.provider_subscription_id IS 'ID genérico de la suscripción en el proveedor de pago';
COMMENT ON COLUMN subscriptions.mercadopago_preapproval_id IS 'ID de preapproval (suscripción) en Mercado Pago';
COMMENT ON COLUMN subscriptions.mercadopago_payer_id IS 'ID del pagador en Mercado Pago';
COMMENT ON COLUMN subscriptions.paypal_subscription_id IS 'ID de la suscripción en PayPal';
COMMENT ON COLUMN subscriptions.paypal_payer_id IS 'ID del pagador en PayPal';

-- ============================================================================
-- PASO 4: Crear tabla payment_transactions (log unificado)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Información del proveedor
    payment_provider payment_provider NOT NULL,
    provider_transaction_id TEXT NOT NULL,
    provider_payment_id TEXT,
    
    -- Tipo de transacción
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'subscription_created',
        'subscription_renewed',
        'subscription_cancelled',
        'subscription_paused',
        'payment_success',
        'payment_failed',
        'refund'
    )),
    
    -- Montos
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Estado
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Metadata adicional (respuesta del proveedor, etc.)
    provider_response JSONB,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Índices para payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user 
ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider 
ON payment_transactions(payment_provider);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created 
ON payment_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_type 
ON payment_transactions(transaction_type);

-- Comentario de tabla
COMMENT ON TABLE payment_transactions IS 'Log unificado de transacciones de todos los proveedores de pago';

-- ============================================================================
-- PASO 5: RLS para payment_transactions
-- ============================================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Usuario solo ve sus propias transacciones
CREATE POLICY "Users can view own transactions" 
ON payment_transactions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Solo service role puede insertar/modificar
CREATE POLICY "Service role can manage transactions" 
ON payment_transactions FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- PASO 6: Crear índices adicionales para subscriptions
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider 
ON subscriptions(payment_provider);

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription 
ON subscriptions(provider_subscription_id);

-- ============================================================================
-- PASO 7: Crear vista actualizada user_current_plan
-- ============================================================================

-- Eliminar vista existente si existe (para recrearla con nuevos campos)
DROP VIEW IF EXISTS user_current_plan;

CREATE VIEW user_current_plan AS
SELECT 
    u.id as user_id,
    u.email,
    p.full_name,
    COALESCE(sp.name, 'Free') as plan_name,
    COALESCE(sp.monthly_queries, 3) as monthly_queries,
    s.status as subscription_status,
    s.current_period_end,
    s.payment_provider,
    COALESCE(ut.queries_count, 0) as queries_this_month
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id 
    AND ut.month = DATE_TRUNC('month', NOW())::DATE;

-- Comentario de vista
COMMENT ON VIEW user_current_plan IS 'Vista consolidada del plan actual del usuario incluyendo proveedor de pago';

-- ============================================================================
-- PASO 8: Función helper para obtener el ID del plan según proveedor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_provider_id(
    p_plan_id UUID,
    p_provider payment_provider
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_provider_id TEXT;
BEGIN
    CASE p_provider
        WHEN 'mercadopago' THEN
            SELECT mercadopago_plan_id INTO v_provider_id
            FROM subscription_plans WHERE id = p_plan_id;
        WHEN 'paypal' THEN
            SELECT paypal_plan_id INTO v_provider_id
            FROM subscription_plans WHERE id = p_plan_id;
        WHEN 'stripe' THEN
            SELECT stripe_price_id INTO v_provider_id
            FROM subscription_plans WHERE id = p_plan_id;
        ELSE
            v_provider_id := NULL;
    END CASE;
    
    RETURN v_provider_id;
END;
$$;

COMMENT ON FUNCTION get_plan_provider_id IS 'Obtiene el ID del plan en el proveedor especificado';

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
-- Para ejecutar: psql -h [host] -U [user] -d [database] -f 001_payment_providers_migration.sql
-- O desde Supabase SQL Editor
-- ============================================================================
