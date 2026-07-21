-- ============================================================================
-- MIGRACIÓN 003: Corregir monthly_queries en user_current_plan
-- ============================================================================
-- Problema: COALESCE(sp.monthly_queries, 3) convertía NULL (ilimitado) en 3,
--           haciendo que el plan Avanzado se comportara como Free.
-- Solución: Solo usar 3 como default cuando el usuario no tiene suscripción.
-- ============================================================================

DROP VIEW IF EXISTS user_current_plan;

CREATE VIEW user_current_plan AS
SELECT 
    u.id as user_id,
    u.email,
    p.full_name,
    COALESCE(sp.name, 'Free') as plan_name,
    CASE
        WHEN sp.id IS NOT NULL THEN sp.monthly_queries
        ELSE 3
    END as monthly_queries,
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

COMMENT ON VIEW user_current_plan IS 'Vista consolidada del plan actual del usuario incluyendo proveedor de pago';
