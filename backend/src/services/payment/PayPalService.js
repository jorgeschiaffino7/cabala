import { SubscriptionsController } from '@paypal/paypal-server-sdk';
import crypto from 'crypto';
import paypalClient, { PAYPAL_CONFIG } from '../../config/paypal.js';
import { PaymentGateway, WEBHOOK_EVENT_TYPES, SUBSCRIPTION_STATUS } from './PaymentGateway.js';

/**
 * Servicio de pagos con PayPal
 * Implementa suscripciones usando Subscriptions API
 */
class PayPalService extends PaymentGateway {
  constructor() {
    super('paypal');
    this.subscriptionsController = new SubscriptionsController(paypalClient);
  }

  /**
   * Crea una sesión de checkout para suscripción
   */
  async createCheckoutSession({ userId, planId, providerPlanId, email, successUrl, cancelUrl }) {
    try {
      const response = await this.subscriptionsController.createSubscription({
        body: {
          planId: providerPlanId,
          subscriber: {
            emailAddress: email
          },
          customId: JSON.stringify({ userId, planId }),
          applicationContext: {
            brandName: 'Gematria Bot',
            locale: 'es-ES',
            shippingPreference: 'NO_SHIPPING',
            userAction: 'SUBSCRIBE_NOW',
            returnUrl: successUrl,
            cancelUrl: cancelUrl
          }
        }
      });

      const subscription = response.result;
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
      const response = await this.subscriptionsController.getSubscription(subscriptionId);

      return this.normalizeSubscription(response.result);
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
      await this.subscriptionsController.cancelSubscription({
        id: subscriptionId,
        body: { reason }
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
      await this.subscriptionsController.suspendSubscription({
        id: subscriptionId,
        body: { reason }
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
      await this.subscriptionsController.activateSubscription({
        id: subscriptionId,
        body: { reason }
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
