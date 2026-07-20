import MercadoPagoService from './MercadoPagoService.js';
import PayPalService from './PayPalService.js';
import { PAYMENT_PROVIDERS } from '../subscription.service.js';

/**
 * Router de pagos - Selecciona y enruta al proveedor correcto
 * Mercado Pago para LATAM, PayPal para el resto del mundo
 */
class PaymentRouter {
  constructor() {
    this.providers = {
      [PAYMENT_PROVIDERS.MERCADOPAGO]: MercadoPagoService,
      [PAYMENT_PROVIDERS.PAYPAL]: PayPalService
    };

    this.countryToProvider = {
      AR: PAYMENT_PROVIDERS.MERCADOPAGO,
      BR: PAYMENT_PROVIDERS.MERCADOPAGO,
      CL: PAYMENT_PROVIDERS.MERCADOPAGO,
      CO: PAYMENT_PROVIDERS.MERCADOPAGO,
      MX: PAYMENT_PROVIDERS.MERCADOPAGO,
      PE: PAYMENT_PROVIDERS.MERCADOPAGO,
      UY: PAYMENT_PROVIDERS.MERCADOPAGO
    };
  }

  /**
   * Determina el proveedor de pago basado en el país
   * @param {string} countryCode - Código ISO del país (2 letras)
   * @returns {string} Nombre del proveedor
   */
  getProviderForCountry(countryCode) {
    const code = countryCode?.toUpperCase();
    return this.countryToProvider[code] || PAYMENT_PROVIDERS.PAYPAL;
  }

  /**
   * Obtiene la instancia del servicio de pago
   * @param {string} provider - Nombre del proveedor
   * @returns {PaymentGateway}
   */
  getProvider(provider) {
    const service = this.providers[provider];
    if (!service) {
      throw new Error(`Proveedor de pago no soportado: ${provider}`);
    }
    return service;
  }

  /**
   * Obtiene el proveedor basado en el país
   * @param {string} countryCode
   * @returns {PaymentGateway}
   */
  getProviderByCountry(countryCode) {
    const providerName = this.getProviderForCountry(countryCode);
    return this.getProvider(providerName);
  }

  /**
   * Crea una sesión de checkout con el proveedor apropiado
   * @param {Object} params
   * @param {string} params.countryCode - País del usuario
   * @param {string} params.provider - Proveedor específico (opcional, override)
   * @param {string} params.userId
   * @param {string} params.planId
   * @param {string} params.providerPlanId
   * @param {string} params.email
   * @param {string} params.successUrl
   * @param {string} params.cancelUrl
   * @returns {Promise<Object>}
   */
  async createCheckoutSession(params) {
    const { countryCode, provider: explicitProvider, ...checkoutParams } = params;
    
    const providerName = explicitProvider || this.getProviderForCountry(countryCode);
    const provider = this.getProvider(providerName);

    const result = await provider.createCheckoutSession(checkoutParams);
    
    return {
      ...result,
      provider: providerName
    };
  }

  /**
   * Obtiene una suscripción del proveedor especificado
   * @param {string} provider
   * @param {string} subscriptionId
   * @returns {Promise<Object>}
   */
  async getSubscription(provider, subscriptionId) {
    const service = this.getProvider(provider);
    return service.getSubscription(subscriptionId);
  }

  /**
   * Cancela una suscripción en el proveedor especificado
   * @param {string} provider
   * @param {string} subscriptionId
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async cancelSubscription(provider, subscriptionId, reason) {
    const service = this.getProvider(provider);
    return service.cancelSubscription(subscriptionId, reason);
  }

  /**
   * Pausa una suscripción
   * @param {string} provider
   * @param {string} subscriptionId
   * @returns {Promise<Object>}
   */
  async pauseSubscription(provider, subscriptionId) {
    const service = this.getProvider(provider);
    return service.pauseSubscription(subscriptionId);
  }

  /**
   * Reactiva una suscripción
   * @param {string} provider
   * @param {string} subscriptionId
   * @returns {Promise<Object>}
   */
  async resumeSubscription(provider, subscriptionId) {
    const service = this.getProvider(provider);
    return service.resumeSubscription(subscriptionId);
  }

  /**
   * Verifica un webhook según el proveedor
   * @param {string} provider
   * @param {Object} params
   * @returns {Promise<boolean>}
   */
  async verifyWebhook(provider, params) {
    const service = this.getProvider(provider);
    return service.verifyWebhookSignature(params);
  }

  /**
   * Procesa un evento de webhook
   * @param {string} provider
   * @param {Object} event
   * @returns {Promise<Object>}
   */
  async processWebhookEvent(provider, event) {
    const service = this.getProvider(provider);
    return service.processWebhookEvent(event);
  }

  /**
   * Obtiene información sobre los proveedores disponibles
   * @returns {Object}
   */
  getAvailableProviders() {
    return {
      mercadopago: {
        name: 'Mercado Pago',
        countries: MercadoPagoService.getSupportedCountries(),
        description: 'Para usuarios en Latinoamérica'
      },
      paypal: {
        name: 'PayPal',
        countries: ['ALL'],
        description: 'Para usuarios en el resto del mundo'
      }
    };
  }

  /**
   * Obtiene los proveedores disponibles para un país
   * @param {string} countryCode
   * @returns {Array}
   */
  getProvidersForCountry(countryCode) {
    const providers = [];
    const code = countryCode?.toUpperCase();

    if (MercadoPagoService.isCountrySupported(code)) {
      providers.push({
        id: PAYMENT_PROVIDERS.MERCADOPAGO,
        name: 'Mercado Pago',
        recommended: true
      });
    }

    providers.push({
      id: PAYMENT_PROVIDERS.PAYPAL,
      name: 'PayPal',
      recommended: !MercadoPagoService.isCountrySupported(code)
    });

    return providers;
  }
}

export default new PaymentRouter();
