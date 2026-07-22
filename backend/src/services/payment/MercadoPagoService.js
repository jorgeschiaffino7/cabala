import { PreApproval, PreApprovalPlan } from 'mercadopago';
import crypto from 'crypto';
import mercadopagoConfig, { MERCADOPAGO_CONFIG } from '../../config/mercadopago.js';
import { PaymentGateway, WEBHOOK_EVENT_TYPES, SUBSCRIPTION_STATUS } from './PaymentGateway.js';

/**
 * Servicio de pagos con Mercado Pago
 * Implementa suscripciones usando Preapproval API
 */
class MercadoPagoService extends PaymentGateway {
  constructor() {
    super('mercadopago');
    this.preApproval = new PreApproval(mercadopagoConfig);
    this.preApprovalPlan = new PreApprovalPlan(mercadopagoConfig);
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  }

  /**
   * Crea una sesión de checkout para suscripción
   * Obtiene el init_point del plan y redirige al usuario
   */
  async createCheckoutSession({ userId, planId, providerPlanId, email, successUrl, cancelUrl, payerInfo }) {
    try {
      // Obtener el plan para conseguir el init_point
      const planResponse = await fetch(`https://api.mercadopago.com/preapproval_plan/${providerPlanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const planData = await planResponse.json();

      if (!planResponse.ok) {
        console.error('MercadoPago get plan error:', planData);
        throw new Error(planData.message || 'Error obteniendo plan de MercadoPago');
      }

      // El init_point del plan es la URL donde el usuario se suscribe
      if (!planData.init_point) {
        throw new Error('El plan no tiene init_point configurado');
      }

      // Agregar parámetros al init_point para tracking
      const checkoutUrl = new URL(planData.init_point);
      checkoutUrl.searchParams.set('external_reference', JSON.stringify({ userId, planId }));
      if (email) {
        checkoutUrl.searchParams.set('payer_email', email);
      }

      return {
        checkoutUrl: checkoutUrl.toString(),
        sessionId: providerPlanId,
        preapprovalId: providerPlanId
      };
    } catch (error) {
      console.error('Error creando checkout de MercadoPago:', error);
      throw new Error(`Error en MercadoPago: ${error.message}`);
    }
  }

  /**
   * Obtiene los detalles de una suscripción (preapproval)
   */
  async getSubscription(subscriptionId) {
    try {
      const response = await this.preApproval.get({ id: subscriptionId });
      return this.normalizeSubscription(response);
    } catch (error) {
      console.error('Error obteniendo suscripción de MercadoPago:', error);
      throw new Error(`Error en MercadoPago: ${error.message}`);
    }
  }

  /**
   * Cancela una suscripción
   */
  async cancelSubscription(subscriptionId) {
    try {
      await this.preApproval.update({
        id: subscriptionId,
        body: {
          status: 'cancelled'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelando suscripción de MercadoPago:', error);
      throw new Error(`Error en MercadoPago: ${error.message}`);
    }
  }

  /**
   * Pausa una suscripción
   */
  async pauseSubscription(subscriptionId) {
    try {
      await this.preApproval.update({
        id: subscriptionId,
        body: {
          status: 'paused'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error pausando suscripción de MercadoPago:', error);
      throw new Error(`Error en MercadoPago: ${error.message}`);
    }
  }

  /**
   * Reactiva una suscripción pausada
   */
  async resumeSubscription(subscriptionId) {
    try {
      await this.preApproval.update({
        id: subscriptionId,
        body: {
          status: 'authorized'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error reactivando suscripción de MercadoPago:', error);
      throw new Error(`Error en MercadoPago: ${error.message}`);
    }
  }

  /**
   * Verifica la firma del webhook de Mercado Pago
   * MP usa x-signature header con formato: ts=xxx,v1=xxx
   */
  async verifyWebhookSignature({ payload, signature, headers, queryParams }) {
    try {
      if (!MERCADOPAGO_CONFIG.webhookSecret) {
        console.warn('MERCADOPAGO_WEBHOOK_SECRET no configurado, omitiendo verificación');
        return true;
      }

      const xSignature = headers['x-signature'];
      const xRequestId = headers['x-request-id'];

      if (!xSignature || !xRequestId) {
        return false;
      }

      const parts = xSignature.split(',');
      let ts, hash;

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') hash = value;
      }

      if (!ts || !hash) return false;

      const dataId = queryParams?.['data.id'] || queryParams?.id;
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      
      const computedHash = crypto
        .createHmac('sha256', MERCADOPAGO_CONFIG.webhookSecret)
        .update(manifest)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(computedHash)
      );
    } catch (error) {
      console.error('Error verificando firma de MercadoPago:', error);
      return false;
    }
  }

  /**
   * Procesa un evento de webhook y retorna datos normalizados
   */
  async processWebhookEvent(notification) {
    const { type, data } = notification;

    const eventMapping = {
      'subscription_preapproval': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED,
      'subscription_authorized_payment': WEBHOOK_EVENT_TYPES.PAYMENT_SUCCESS,
      'subscription_preapproval_plan': WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED
    };

    let eventType = eventMapping[type];
    let subscriptionData = null;

    if (data?.id) {
      try {
        const subscription = await this.getSubscription(data.id);
        subscriptionData = subscription;

        if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
          eventType = WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CANCELLED;
        } else if (subscription.status === SUBSCRIPTION_STATUS.PAUSED) {
          eventType = WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED;
        } else if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
          if (type === 'subscription_authorized_payment') {
            eventType = WEBHOOK_EVENT_TYPES.PAYMENT_SUCCESS;
          } else {
            eventType = WEBHOOK_EVENT_TYPES.SUBSCRIPTION_ACTIVATED;
          }
        }
      } catch (error) {
        console.error('Error obteniendo datos de suscripción:', error);
      }
    }

    return {
      type: eventType || type,
      data: subscriptionData,
      raw: notification
    };
  }

  /**
   * Normaliza los datos de suscripción de MP a nuestro formato
   */
  normalizeSubscription(mpSubscription) {
    const statusMap = {
      'authorized': SUBSCRIPTION_STATUS.ACTIVE,
      'paused': SUBSCRIPTION_STATUS.PAUSED,
      'cancelled': SUBSCRIPTION_STATUS.CANCELLED,
      'pending': SUBSCRIPTION_STATUS.PENDING
    };

    let externalRef = {};
    try {
      externalRef = JSON.parse(mpSubscription.external_reference || '{}');
    } catch (e) {
      externalRef = { raw: mpSubscription.external_reference };
    }

    return {
      id: mpSubscription.id,
      status: statusMap[mpSubscription.status] || mpSubscription.status,
      payerId: mpSubscription.payer_id,
      payerEmail: mpSubscription.payer_email,
      planId: mpSubscription.preapproval_plan_id,
      externalReference: externalRef,
      userId: externalRef.userId,
      internalPlanId: externalRef.planId,
      currentPeriodStart: mpSubscription.date_created,
      currentPeriodEnd: mpSubscription.next_payment_date,
      lastPaymentDate: mpSubscription.last_modified,
      provider: 'mercadopago',
      raw: mpSubscription
    };
  }

  /**
   * Verifica si un país es soportado por Mercado Pago
   */
  isCountrySupported(countryCode) {
    return MERCADOPAGO_CONFIG.supportedCountries.includes(countryCode?.toUpperCase());
  }

  /**
   * Obtiene la lista de países soportados
   */
  getSupportedCountries() {
    return MERCADOPAGO_CONFIG.supportedCountries;
  }
}

export default new MercadoPagoService();
