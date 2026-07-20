import express from 'express';
import subscriptionService, { PAYMENT_PROVIDERS } from '../services/subscription.service.js';
import { MercadoPagoService, WEBHOOK_EVENT_TYPES } from '../services/payment/index.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/webhooks/mercadopago
 * Recibe notificaciones IPN de Mercado Pago
 */
router.post('/', express.json(), async (req, res) => {
  console.log('📩 Webhook de Mercado Pago recibido:', req.body.type);

  try {
    const isValid = await MercadoPagoService.verifyWebhookSignature({
      payload: JSON.stringify(req.body),
      signature: req.headers['x-signature'],
      headers: req.headers,
      queryParams: req.query
    });

    if (!isValid) {
      console.error('⚠️ Firma de webhook inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, data } = req.body;

    if (type === 'subscription_preapproval' && data?.id) {
      await handlePreapprovalEvent(data.id);
    } else if (type === 'subscription_authorized_payment' && data?.id) {
      await handlePaymentEvent(data.id);
    } else {
      console.log(`Evento no manejado: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook de MercadoPago:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Maneja eventos de preapproval (suscripción)
 */
async function handlePreapprovalEvent(preapprovalId) {
  console.log('🔄 Procesando preapproval:', preapprovalId);

  try {
    const subscription = await MercadoPagoService.getSubscription(preapprovalId);
    
    if (!subscription.userId) {
      console.error('No se encontró userId en external_reference');
      return;
    }

    const planId = subscription.internalPlanId || 
      await subscriptionService.getPlanIdByName('Estudio');

    await subscriptionService.upsertSubscription({
      userId: subscription.userId,
      planId: planId,
      paymentProvider: PAYMENT_PROVIDERS.MERCADOPAGO,
      providerCustomerId: subscription.payerId,
      providerSubscriptionId: subscription.id,
      mercadopagoPreapprovalId: subscription.id,
      mercadopagoPayerId: subscription.payerId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd
    });

    await subscriptionService.logTransaction({
      userId: subscription.userId,
      paymentProvider: PAYMENT_PROVIDERS.MERCADOPAGO,
      providerTransactionId: subscription.id,
      transactionType: getTransactionType(subscription.status),
      amountCents: 0,
      currency: 'ARS',
      status: 'completed',
      providerResponse: subscription.raw
    });

    console.log(`✅ Suscripción MP actualizada para usuario ${subscription.userId}`);
  } catch (error) {
    console.error('Error procesando preapproval:', error);
    throw error;
  }
}

/**
 * Maneja eventos de pago autorizado
 */
async function handlePaymentEvent(paymentId) {
  console.log('💰 Procesando pago:', paymentId);

  try {
    const subscription = await MercadoPagoService.getSubscription(paymentId);
    
    if (!subscription.userId) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('mercadopago_preapproval_id', paymentId)
        .single();

      if (existingSub) {
        await subscriptionService.logTransaction({
          userId: existingSub.user_id,
          paymentProvider: PAYMENT_PROVIDERS.MERCADOPAGO,
          providerTransactionId: paymentId,
          transactionType: 'payment_success',
          amountCents: 0,
          currency: 'ARS',
          status: 'completed'
        });

        console.log(`✅ Pago registrado para usuario ${existingSub.user_id}`);
      }
      return;
    }

    await subscriptionService.logTransaction({
      userId: subscription.userId,
      paymentProvider: PAYMENT_PROVIDERS.MERCADOPAGO,
      providerTransactionId: paymentId,
      transactionType: 'payment_success',
      amountCents: 0,
      currency: 'ARS',
      status: 'completed',
      providerResponse: subscription.raw
    });

    console.log(`✅ Pago registrado para usuario ${subscription.userId}`);
  } catch (error) {
    console.error('Error procesando pago:', error);
  }
}

/**
 * Determina el tipo de transacción según el estado
 */
function getTransactionType(status) {
  const typeMap = {
    'active': 'subscription_created',
    'authorized': 'subscription_created',
    'paused': 'subscription_paused',
    'cancelled': 'subscription_cancelled',
    'canceled': 'subscription_cancelled'
  };
  return typeMap[status] || 'subscription_created';
}

export default router;
