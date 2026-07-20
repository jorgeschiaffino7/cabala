/**
 * Interface abstracta para proveedores de pago
 * Todos los servicios de pago deben implementar estos métodos
 */
export class PaymentGateway {
  constructor(providerName) {
    this.providerName = providerName;
    
    if (new.target === PaymentGateway) {
      throw new Error('PaymentGateway es una clase abstracta y no puede instanciarse directamente');
    }
  }

  /**
   * Crea una sesión de checkout/suscripción
   * @param {Object} params
   * @param {string} params.userId - ID del usuario
   * @param {string} params.planId - ID del plan en nuestra BD
   * @param {string} params.providerPlanId - ID del plan en el proveedor
   * @param {string} params.email - Email del usuario
   * @param {string} params.successUrl - URL de redirección después del pago exitoso
   * @param {string} params.cancelUrl - URL de redirección si cancela
   * @returns {Promise<{checkoutUrl: string, sessionId: string}>}
   */
  async createCheckoutSession(params) {
    throw new Error('Método createCheckoutSession debe ser implementado');
  }

  /**
   * Obtiene los detalles de una suscripción
   * @param {string} subscriptionId - ID de la suscripción en el proveedor
   * @returns {Promise<Object>}
   */
  async getSubscription(subscriptionId) {
    throw new Error('Método getSubscription debe ser implementado');
  }

  /**
   * Cancela una suscripción
   * @param {string} subscriptionId - ID de la suscripción en el proveedor
   * @returns {Promise<{success: boolean}>}
   */
  async cancelSubscription(subscriptionId) {
    throw new Error('Método cancelSubscription debe ser implementado');
  }

  /**
   * Pausa una suscripción (si el proveedor lo soporta)
   * @param {string} subscriptionId
   * @returns {Promise<{success: boolean}>}
   */
  async pauseSubscription(subscriptionId) {
    throw new Error('Método pauseSubscription debe ser implementado');
  }

  /**
   * Reactiva una suscripción pausada
   * @param {string} subscriptionId
   * @returns {Promise<{success: boolean}>}
   */
  async resumeSubscription(subscriptionId) {
    throw new Error('Método resumeSubscription debe ser implementado');
  }

  /**
   * Verifica la firma de un webhook
   * @param {Object} params
   * @param {string} params.payload - Body del webhook (raw)
   * @param {string} params.signature - Firma del webhook
   * @param {Object} params.headers - Headers de la request
   * @returns {Promise<boolean>}
   */
  async verifyWebhookSignature(params) {
    throw new Error('Método verifyWebhookSignature debe ser implementado');
  }

  /**
   * Procesa un evento de webhook y retorna datos normalizados
   * @param {Object} event - Evento del webhook
   * @returns {Promise<{type: string, data: Object}>}
   */
  async processWebhookEvent(event) {
    throw new Error('Método processWebhookEvent debe ser implementado');
  }

  /**
   * Normaliza los datos de suscripción del proveedor a nuestro formato
   * @param {Object} providerSubscription - Suscripción en formato del proveedor
   * @returns {Object} Suscripción normalizada
   */
  normalizeSubscription(providerSubscription) {
    throw new Error('Método normalizeSubscription debe ser implementado');
  }

  /**
   * Obtiene el nombre del proveedor
   * @returns {string}
   */
  getProviderName() {
    return this.providerName;
  }
}

/**
 * Tipos de eventos normalizados
 */
export const WEBHOOK_EVENT_TYPES = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  REFUND: 'refund'
};

/**
 * Estados de suscripción normalizados
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'canceled',
  PAUSED: 'paused',
  PAST_DUE: 'past_due',
  PENDING: 'pending',
  TRIALING: 'trialing'
};
