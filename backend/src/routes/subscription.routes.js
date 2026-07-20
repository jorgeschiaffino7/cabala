import express from 'express';
import { authenticate } from '../middleware/auth.js';
import subscriptionService, { PAYMENT_PROVIDERS } from '../services/subscription.service.js';
import { PaymentRouter } from '../services/payment/index.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/subscriptions/plans
 * Obtiene todos los planes disponibles
 * Público - no requiere autenticación
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();

    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price_cents / 100,
      priceCents: plan.price_cents,
      monthlyQueries: plan.monthly_queries,
      features: plan.features || [],
      isPopular: plan.name === 'Estudio'
    }));

    res.json({
      success: true,
      data: formattedPlans
    });
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener planes'
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Obtiene la suscripción actual del usuario
 * Requiere autenticación
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = await subscriptionService.getUserPlan(userId);

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      data: {
        plan: {
          name: plan.plan_name,
          monthlyQueries: plan.monthly_queries,
          queriesUsed: plan.queries_this_month || 0,
          queriesRemaining: plan.monthly_queries 
            ? Math.max(0, plan.monthly_queries - (plan.queries_this_month || 0))
            : null
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          paymentProvider: subscription.payment_provider,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        } : null,
        isActive: plan.subscription_status === 'active',
        isFree: plan.plan_name === 'Free'
      }
    });
  } catch (error) {
    console.error('Error obteniendo suscripción actual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener suscripción'
    });
  }
});

/**
 * GET /api/subscriptions/providers
 * Obtiene los proveedores de pago disponibles para el país del usuario
 */
router.get('/providers', async (req, res) => {
  try {
    const countryCode = req.query.country || req.headers['cf-ipcountry'] || 'US';
    const providers = PaymentRouter.getProvidersForCountry(countryCode);

    res.json({
      success: true,
      data: {
        country: countryCode,
        providers,
        recommended: providers.find(p => p.recommended)?.id || PAYMENT_PROVIDERS.PAYPAL
      }
    });
  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proveedores'
    });
  }
});

/**
 * POST /api/subscriptions/create-checkout
 * Crea una sesión de checkout con el proveedor apropiado
 * Requiere autenticación
 */
router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { planName, provider, countryCode } = req.body;

    if (!planName) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el nombre del plan'
      });
    }

    const plan = await subscriptionService.getPlanWithProviderIds(planName);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan no encontrado'
      });
    }

    if (plan.name === 'Free') {
      return res.status(400).json({
        success: false,
        error: 'El plan Free no requiere pago'
      });
    }

    const selectedProvider = provider || PaymentRouter.getProviderForCountry(countryCode);
    
    let providerPlanId;
    if (selectedProvider === PAYMENT_PROVIDERS.MERCADOPAGO) {
      providerPlanId = plan.mercadopago_plan_id;
    } else if (selectedProvider === PAYMENT_PROVIDERS.PAYPAL) {
      providerPlanId = plan.paypal_plan_id;
    }

    if (!providerPlanId) {
      return res.status(400).json({
        success: false,
        error: `Plan no configurado para ${selectedProvider}. Contacta al soporte.`
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?payment=cancelled`;

    const checkoutSession = await PaymentRouter.createCheckoutSession({
      countryCode,
      provider: selectedProvider,
      userId,
      planId: plan.id,
      providerPlanId,
      email: userEmail,
      successUrl,
      cancelUrl
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: checkoutSession.checkoutUrl,
        sessionId: checkoutSession.sessionId,
        provider: checkoutSession.provider
      }
    });
  } catch (error) {
    console.error('Error creando checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear sesión de pago'
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancela la suscripción del usuario
 * Requiere autenticación
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('payment_provider, provider_subscription_id, mercadopago_preapproval_id, paypal_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró suscripción activa'
      });
    }

    const provider = subscription.payment_provider;
    let subscriptionId;

    if (provider === PAYMENT_PROVIDERS.MERCADOPAGO) {
      subscriptionId = subscription.mercadopago_preapproval_id || subscription.provider_subscription_id;
    } else if (provider === PAYMENT_PROVIDERS.PAYPAL) {
      subscriptionId = subscription.paypal_subscription_id || subscription.provider_subscription_id;
    }

    if (subscriptionId && provider !== PAYMENT_PROVIDERS.NONE) {
      await PaymentRouter.cancelSubscription(provider, subscriptionId, reason);
    }

    await subscriptionService.cancelSubscription(userId);

    await subscriptionService.logTransaction({
      userId,
      paymentProvider: provider,
      providerTransactionId: subscriptionId || 'manual',
      transactionType: 'subscription_cancelled',
      amountCents: 0,
      currency: 'USD',
      status: 'completed',
      metadata: { reason, cancelledBy: 'user' }
    });

    res.json({
      success: true,
      message: 'Suscripción cancelada correctamente'
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar suscripción'
    });
  }
});

/**
 * POST /api/subscriptions/pause
 * Pausa la suscripción del usuario (si el proveedor lo soporta)
 * Requiere autenticación
 */
router.post('/pause', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('payment_provider, provider_subscription_id, mercadopago_preapproval_id, paypal_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró suscripción activa'
      });
    }

    const provider = subscription.payment_provider;
    let subscriptionId;

    if (provider === PAYMENT_PROVIDERS.MERCADOPAGO) {
      subscriptionId = subscription.mercadopago_preapproval_id || subscription.provider_subscription_id;
    } else if (provider === PAYMENT_PROVIDERS.PAYPAL) {
      subscriptionId = subscription.paypal_subscription_id || subscription.provider_subscription_id;
    }

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No se puede pausar esta suscripción'
      });
    }

    await PaymentRouter.pauseSubscription(provider, subscriptionId);

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'paused' })
      .eq('user_id', userId);

    res.json({
      success: true,
      message: 'Suscripción pausada correctamente'
    });
  } catch (error) {
    console.error('Error pausando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al pausar suscripción'
    });
  }
});

/**
 * POST /api/subscriptions/resume
 * Reactiva una suscripción pausada
 * Requiere autenticación
 */
router.post('/resume', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('payment_provider, provider_subscription_id, mercadopago_preapproval_id, paypal_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'paused')
      .single();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró suscripción pausada'
      });
    }

    const provider = subscription.payment_provider;
    let subscriptionId;

    if (provider === PAYMENT_PROVIDERS.MERCADOPAGO) {
      subscriptionId = subscription.mercadopago_preapproval_id || subscription.provider_subscription_id;
    } else if (provider === PAYMENT_PROVIDERS.PAYPAL) {
      subscriptionId = subscription.paypal_subscription_id || subscription.provider_subscription_id;
    }

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No se puede reactivar esta suscripción'
      });
    }

    await PaymentRouter.resumeSubscription(provider, subscriptionId);

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('user_id', userId);

    res.json({
      success: true,
      message: 'Suscripción reactivada correctamente'
    });
  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reactivar suscripción'
    });
  }
});

/**
 * GET /api/subscriptions/transactions
 * Obtiene el historial de transacciones del usuario
 * Requiere autenticación
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await subscriptionService.getUserTransactions(userId, limit);

    res.json({
      success: true,
      data: transactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        provider: t.payment_provider,
        amount: t.amount_cents / 100,
        currency: t.currency,
        status: t.status,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener transacciones'
    });
  }
});

export default router;
