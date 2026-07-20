import express from 'express';
import Stripe from 'stripe';
import subscriptionService from '../services/subscription.service.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Recibe eventos de Stripe
 * IMPORTANTE: debe usar raw body, no JSON parsed
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      // Verificar webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar el evento
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error procesando webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

/**
 * Checkout completado - crear suscripción inicial
 */
async function handleCheckoutCompleted(session) {
  console.log('✅ Checkout completed:', session.id);

  const userId = session.metadata.user_id;
  const planId = session.metadata.plan_id;

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Recuperar la suscripción de Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await subscriptionService.upsertSubscription({
    userId,
    planId,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  });

  console.log(`✅ Suscripción creada para usuario ${userId}`);
}

/**
 * Suscripción actualizada (renovación, cambio de plan)
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const customerId = subscription.customer;
  
  // Buscar usuario por customer ID
  const { supabaseAdmin } = await import('../config/supabase.js');
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!existingSub) {
    console.error('No se encontró suscripción para customer:', customerId);
    return;
  }

  await subscriptionService.upsertSubscription({
    userId: existingSub.user_id,
    planId: existingSub.plan_id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  });

  console.log(`✅ Suscripción actualizada para usuario ${existingSub.user_id}`);
}

/**
 * Suscripción cancelada
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const customerId = subscription.customer;
  
  const { supabaseAdmin } = await import('../config/supabase.js');
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (existingSub) {
    await subscriptionService.cancelSubscription(existingSub.user_id);
    console.log(`✅ Suscripción cancelada para usuario ${existingSub.user_id}`);
  }
}

/**
 * Pago exitoso (renovación mensual)
 */
async function handlePaymentSucceeded(invoice) {
  console.log('💰 Payment succeeded:', invoice.id);
  // Aquí podrías enviar email de confirmación, etc.
}

/**
 * Pago fallido
 */
async function handlePaymentFailed(invoice) {
  console.log('⚠️  Payment failed:', invoice.id);
  
  const customerId = invoice.customer;
  
  const { supabaseAdmin } = await import('../config/supabase.js');
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (existingSub) {
    // Actualizar estado a 'past_due'
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('user_id', existingSub.user_id);

    console.log(`⚠️  Estado actualizado a past_due para usuario ${existingSub.user_id}`);
  }
}

export default router;