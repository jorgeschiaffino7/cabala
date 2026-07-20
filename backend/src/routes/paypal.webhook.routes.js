import express from 'express';
import subscriptionService, { PAYMENT_PROVIDERS } from '../services/subscription.service.js';
import { PayPalService, WEBHOOK_EVENT_TYPES } from '../services/payment/index.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/webhooks/paypal
 * Recibe eventos de webhook de PayPal
 */
router.post('/', express.json(), async (req, res) => {
  console.log('📩 Webhook de PayPal recibido:', req.body.event_type);

  try {
    const isValid = await PayPalService.verifyWebhookSignature({
      payload: JSON.stringify(req.body),
      headers: req.headers
    });

    if (!isValid) {
      console.error('⚠️ Firma de webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event_type;
    const resource = event.resource;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionCancelled(resource);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource);
        break;

      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        await handleSubscriptionReactivated(resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentFailed(resource, eventType);
        break;

      default:
        console.log(`Evento no manejado: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook de PayPal:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Suscripción activada
 */
async function handleSubscriptionActivated(resource) {
  console.log('✅ Suscripción PayPal activada:', resource.id);

  try {
    const subscription = await PayPalService.getSubscription(resource.id);
    
    if (!subscription.userId) {
      console.error('No se encontró userId en custom_id');
      return;
    }

    const planId = subscription.internalPlanId || 
      await subscriptionService.getPlanIdByName('Estudio');

    await subscriptionService.upsertSubscription({
      userId: subscription.userId,
      planId: planId,
      paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
      providerCustomerId: subscription.payerId,
      providerSubscriptionId: subscription.id,
      paypalSubscriptionId: subscription.id,
      paypalPayerId: subscription.payerId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd
    });

    await subscriptionService.logTransaction({
      userId: subscription.userId,
      paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
      providerTransactionId: subscription.id,
      transactionType: 'subscription_created',
      amountCents: parseAmount(subscription.lastPaymentAmount),
      currency: 'USD',
      status: 'completed',
      providerResponse: subscription.raw
    });

    console.log(`✅ Suscripción PayPal creada para usuario ${subscription.userId}`);
  } catch (error) {
    console.error('Error procesando activación:', error);
    throw error;
  }
}

/**
 * Suscripción actualizada (renovación)
 */
async function handleSubscriptionUpdated(resource) {
  console.log('🔄 Suscripción PayPal actualizada:', resource.id);

  try {
    const subscription = await PayPalService.getSubscription(resource.id);
    
    let userId = subscription.userId;

    if (!userId) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('paypal_subscription_id', resource.id)
        .single();

      if (existingSub) {
        userId = existingSub.user_id;
      }
    }

    if (!userId) {
      console.error('No se pudo identificar el usuario');
      return;
    }

    await subscriptionService.upsertSubscription({
      userId: userId,
      paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
      providerSubscriptionId: subscription.id,
      paypalSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd
    });

    await subscriptionService.logTransaction({
      userId: userId,
      paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
      providerTransactionId: subscription.id,
      transactionType: 'subscription_renewed',
      amountCents: parseAmount(subscription.lastPaymentAmount),
      currency: 'USD',
      status: 'completed'
    });

    console.log(`✅ Suscripción PayPal renovada para usuario ${userId}`);
  } catch (error) {
    console.error('Error procesando actualización:', error);
  }
}

/**
 * Suscripción cancelada
 */
async function handleSubscriptionCancelled(resource) {
  console.log('❌ Suscripción PayPal cancelada:', resource.id);

  try {
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('paypal_subscription_id', resource.id)
      .single();

    if (existingSub) {
      await subscriptionService.cancelSubscription(existingSub.user_id);

      await subscriptionService.logTransaction({
        userId: existingSub.user_id,
        paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
        providerTransactionId: resource.id,
        transactionType: 'subscription_cancelled',
        amountCents: 0,
        currency: 'USD',
        status: 'completed'
      });

      console.log(`✅ Suscripción cancelada para usuario ${existingSub.user_id}`);
    }
  } catch (error) {
    console.error('Error procesando cancelación:', error);
  }
}

/**
 * Suscripción suspendida (pausada)
 */
async function handleSubscriptionSuspended(resource) {
  console.log('⏸️ Suscripción PayPal suspendida:', resource.id);

  try {
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('paypal_subscription_id', resource.id)
      .single();

    if (existingSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('user_id', existingSub.user_id);

      await subscriptionService.logTransaction({
        userId: existingSub.user_id,
        paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
        providerTransactionId: resource.id,
        transactionType: 'subscription_paused',
        amountCents: 0,
        currency: 'USD',
        status: 'completed'
      });

      console.log(`✅ Suscripción pausada para usuario ${existingSub.user_id}`);
    }
  } catch (error) {
    console.error('Error procesando suspensión:', error);
  }
}

/**
 * Suscripción reactivada
 */
async function handleSubscriptionReactivated(resource) {
  console.log('▶️ Suscripción PayPal reactivada:', resource.id);

  try {
    const subscription = await PayPalService.getSubscription(resource.id);

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan_id')
      .eq('paypal_subscription_id', resource.id)
      .single();

    if (existingSub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'active',
          current_period_end: subscription.currentPeriodEnd
        })
        .eq('user_id', existingSub.user_id);

      console.log(`✅ Suscripción reactivada para usuario ${existingSub.user_id}`);
    }
  } catch (error) {
    console.error('Error procesando reactivación:', error);
  }
}

/**
 * Pago completado
 */
async function handlePaymentCompleted(resource) {
  console.log('💰 Pago PayPal completado:', resource.id);

  try {
    const billingAgreementId = resource.billing_agreement_id;
    
    if (billingAgreementId) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('paypal_subscription_id', billingAgreementId)
        .single();

      if (existingSub) {
        await subscriptionService.logTransaction({
          userId: existingSub.user_id,
          paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
          providerTransactionId: resource.id,
          providerPaymentId: resource.id,
          transactionType: 'payment_success',
          amountCents: parseAmount(resource.amount?.total),
          currency: resource.amount?.currency || 'USD',
          status: 'completed',
          providerResponse: resource
        });

        console.log(`✅ Pago registrado para usuario ${existingSub.user_id}`);
      }
    }
  } catch (error) {
    console.error('Error procesando pago:', error);
  }
}

/**
 * Pago fallido o reembolsado
 */
async function handlePaymentFailed(resource, eventType) {
  console.log(`⚠️ Pago PayPal ${eventType}:`, resource.id);

  try {
    const billingAgreementId = resource.billing_agreement_id;
    
    if (billingAgreementId) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('paypal_subscription_id', billingAgreementId)
        .single();

      if (existingSub) {
        const transactionType = eventType === 'PAYMENT.SALE.REFUNDED' 
          ? 'refund' 
          : 'payment_failed';

        if (eventType === 'PAYMENT.SALE.DENIED') {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('user_id', existingSub.user_id);
        }

        await subscriptionService.logTransaction({
          userId: existingSub.user_id,
          paymentProvider: PAYMENT_PROVIDERS.PAYPAL,
          providerTransactionId: resource.id,
          transactionType: transactionType,
          amountCents: parseAmount(resource.amount?.total),
          currency: resource.amount?.currency || 'USD',
          status: 'failed',
          providerResponse: resource
        });

        console.log(`⚠️ ${transactionType} registrado para usuario ${existingSub.user_id}`);
      }
    }
  } catch (error) {
    console.error('Error procesando fallo de pago:', error);
  }
}

/**
 * Convierte monto string a centavos
 */
function parseAmount(amount) {
  if (!amount) return 0;
  const num = parseFloat(amount);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export default router;
