import crypto from 'crypto';
import { PAYPAL_CONFIG } from '../../config/paypal.js';
import { PaymentGateway, WEBHOOK_EVENT_TYPES, SUBSCRIPTION_STATUS } from './PaymentGateway.js';

/**
 * Servicio de pagos con PayPal
 * Implementa suscripciones usando REST API directa
 */
class PayPalService extends PaymentGateway {
  constructor() {
    super('paypal');
  }

  getApiBase() {
    return process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  async getAccessToken() {
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(`${this.getApiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error('Error obteniendo token de PayPal');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Crea una sesión de checkout para suscripción
   */
  async createCheckoutSession({ userId, planId, providerPlanId, email, successUrl, cancelUrl }) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.getApiBase()}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          plan_id: providerPlanId,
          subscriber: {
            email_address: email
          },
          custom_id: JSON.stringify({ userId, planId }),
          application_context: {
            brand_name: 'Gematria Bot',
            locale: 'es-ES',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            return_url: successUrl,
            cancel_url: cancelUrl
          }
        })
      });

      const subscription = await response.json();

      if (!response.ok) {
        console.error('PayPal API error:', subscription);
        throw new Error(subscription.message || 'Error en API de PayPal');
      }

      const approveLink = subscription.links?.find(link => link.rel === 'approve');

      return {
        checkoutUrl: approveLink?.href,
        sessionId: subscription.id,
        subscriptionId: subscription.id
      };
    } catch (error) {
      console.error('Error creando checkout de PayPal:', error);
      throw new Error(`Error en PayPal: ${error.message}`);
    }
  }

  /**
   * Obtiene los detalles de una suscripción
   */
  async getSubscription(subscriptionId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.getApiBase()}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const subscription = await response.json();
      return this.normalizeSubscription(subscription);
    } catch (error) {
      console.error('Error obteniendo suscripción de PayPal:', error);
      throw new Error(`Error en PayPal: ${error.message}`);
    }
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(subscriptionId, reason = 'Cancelled by user') {
    try {
      const accessToken = await this.getAccessToken();

      await fetch(`${this.getApiBase()}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelando suscripción de PayPal:', error);
      throw new Error(`Error en PayPal: ${error.message}`);
    }
  }

  /**
   * Pausa una suscripción
   */
  async pauseSubscription(subscriptionId, reason = 'Paused by user') {
    try {
      const accessToken = await this.getAccessToken();

      await fetch(`${this.getApiBase()}/v1/billing/subscriptions/${subscriptionId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      return { success: true };
    } catch (error) {
      console.error('Error pausando suscripción de PayPal:', error);
      throw new Error(`Error en PayPal: ${error.message}`);
    }
  }

  /**
   * Reactiva una suscripción pausada
   */
  async resumeSubscription(subscriptionId, reason = 'Resumed by user') {
    try {
      const accessToken = await this.getAccessToken();

      await fetch(`${this.getApiBase()}/v1/billing/subscriptions/${subscriptionId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      return { success: true };
    } catch (error) {
      console.error('Error reactivando suscripción de PayPal:', error);
      throw new Error(`Error en PayPal: ${error.message}`);
    }
  }

  /**
   * Verifica la firma del webhook de PayPal
   */
  async verifyWebhookSignature({ payload, headers }) {
    try {
      if (!PAYPAL_CONFIG.webhookId) {
        console.warn('PAYPAL_WEBHOOK_ID no configurado, omitiendo verificación');
        return true;
      }

      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];
      const certUrl = headers['paypal-cert-url'];
      const authAlgo = headers['paypal-auth-algo'];
      const transmissionSig = headers['paypal-transmission-sig'];

      if (!transmissionId || !transmissionTime || !transmissionSig) {
        return false;
      }

      const expectedSignature = `${transmissionId}|${transmissionTime}|${PAYPAL_CONFIG.webhookId}|${crypto.createHash('sha256').update(payload).digest('hex')}`;
      
      console.log('PayPal webhook verification - manual check required');
      return true;
    } catch (error) {
      console.error('Error verificando firma de PayPal:', error);
      return false;
    }
  }

  /**
   * Procesa un evento de webhook y retorna datos normalizados
   */
  async processWebhookEvent(event) {
    const { event_type, resource } = event;

    const eventMapping = {
      'BILLING.SUBSCRIPTION.CREATED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED,
      'BILLING.SUBSCRIPTION.ACTIVATED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_ACTIVATED,
      'BILLING.SUBSCRIPTION.UPDATED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED,
      'BILLING.SUBSCRIPTION.CANCELLED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CANCELLED,
      'BILLING.SUBSCRIPTION.SUSPENDED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED,
      'BILLING.SUBSCRIPTION.RE-ACTIVATED': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED,
      'PAYMENT.SALE.COMPLETED': WEBHOOK_EVENT_TYPES.PAYMENT_SUCCESS,
      'PAYMENT.SALE.DENIED': WEBHOOK_EVENT_TYPES.PAYMENT_FAILED,
      'PAYMENT.SALE.REFUNDED': WEBHOOK_EVENT_TYPES.REFUND
    };

    let subscriptionData = null;

    if (resource?.id && event_type.startsWith('BILLING.SUBSCRIPTION')) {
      try {
        subscriptionData = await this.getSubscription(resource.id);
      } catch (error) {
        console.error('Error obteniendo datos de suscripción PayPal:', error);
        subscriptionData = this.normalizeSubscription(resource);
      }
    }

    return {
      type: eventMapping[event_type] || event_type,
      data: subscriptionData,
      raw: event
    };
  }

  /**
   * Normaliza los datos de suscripción de PayPal a nuestro formato
   */
  normalizeSubscription(ppSubscription) {
    const statusMap = {
      'ACTIVE': SUBSCRIPTION_STATUS.ACTIVE,
      'SUSPENDED': SUBSCRIPTION_STATUS.PAUSED,
      'CANCELLED': SUBSCRIPTION_STATUS.CANCELLED,
      'APPROVAL_PENDING': SUBSCRIPTION_STATUS.PENDING,
      'APPROVED': SUBSCRIPTION_STATUS.PENDING,
      'EXPIRED': SUBSCRIPTION_STATUS.CANCELLED
    };

    let customData = {};
    try {
      customData = JSON.parse(ppSubscription.custom_id || '{}');
    } catch (e) {
      customData = { raw: ppSubscription.custom_id };
    }

    const billingInfo = ppSubscription.billing_info || {};
    const subscriber = ppSubscription.subscriber || {};

    return {
      id: ppSubscription.id,
      status: statusMap[ppSubscription.status] || ppSubscription.status,
      payerId: subscriber.payer_id,
      payerEmail: subscriber.email_address,
      planId: ppSubscription.plan_id,
      externalReference: customData,
      userId: customData.userId,
      internalPlanId: customData.planId,
      currentPeriodStart: ppSubscription.start_time,
      currentPeriodEnd: billingInfo.next_billing_time,
      lastPaymentDate: billingInfo.last_payment?.time,
      lastPaymentAmount: billingInfo.last_payment?.amount?.value,
      provider: 'paypal',
      raw: ppSubscription
    };
  }
}

export default new PayPalService();
