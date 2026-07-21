import { supabaseAdmin } from '../config/supabase.js';

/**
 * Proveedores de pago soportados
 */
export const PAYMENT_PROVIDERS = {
  MERCADOPAGO: 'mercadopago',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  NONE: 'none'
};

/**
 * Servicio de suscripciones
 * Soporta múltiples proveedores: Mercado Pago, PayPal, Stripe
 */
class SubscriptionService {
  /**
   * Obtiene el plan actual de un usuario
   * @param {string} userId 
   * @returns {Object|null}
   */
  async getUserPlan(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_current_plan')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error obteniendo plan:', error);
        return this.getDefaultFreePlan();
      }

      const plan = data || this.getDefaultFreePlan();

      // Plan Avanzado = consultas ilimitadas (monthly_queries NULL en DB)
      if (plan.plan_name === 'Avanzado') {
        plan.monthly_queries = null;
      }

      return plan;
    } catch (error) {
      console.error('Error en getUserPlan:', error);
      return this.getDefaultFreePlan();
    }
  }

  /**
   * Plan Free por defecto
   */
  getDefaultFreePlan() {
    return {
      plan_name: 'Free',
      monthly_queries: 3,
      queries_this_month: 0,
      subscription_status: 'active'
    };
  }

  /**
   * Valida si el usuario puede hacer una consulta
   * @param {string} userId 
   * @returns {Object} { allowed: boolean, reason?: string, remaining?: number }
   */
  async canMakeQuery(userId) {
    const plan = await this.getUserPlan(userId);

    // Plan con consultas ilimitadas
    if (plan.monthly_queries === null) {
      return { allowed: true, plan: plan.plan_name };
    }

    // Verificar límite mensual
    const remaining = plan.monthly_queries - (plan.queries_this_month || 0);

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Límite mensual alcanzado',
        plan: plan.plan_name,
        remaining: 0
      };
    }

    return {
      allowed: true,
      plan: plan.plan_name,
      remaining
    };
  }

  /**
   * Incrementa el contador de uso mensual
   * @param {string} userId 
   * @returns {number} Nuevo contador
   */
  async incrementUsage(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('increment_monthly_usage', { p_user_id: userId });

      if (error) {
        console.error('Error incrementando uso:', error);
        return 0;
      }

      return data;
    } catch (error) {
      console.error('Error en incrementUsage:', error);
      return 0;
    }
  }

  /**
   * Obtiene todas las suscripciones disponibles
   * @returns {Array}
   */
  async getAvailablePlans() {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo planes:', error);
      return [];
    }
  }

  /**
   * Crea o actualiza suscripción (usado en webhooks de proveedores de pago)
   * Soporta: Mercado Pago, PayPal, Stripe
   * @param {Object} subscriptionData 
   */
  async upsertSubscription(subscriptionData) {
    const {
      userId,
      planId,
      paymentProvider,
      providerCustomerId,
      providerSubscriptionId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      // Campos específicos de Mercado Pago
      mercadopagoPreapprovalId,
      mercadopagoPayerId,
      // Campos específicos de PayPal
      paypalSubscriptionId,
      paypalPayerId,
      // Campos legacy de Stripe (para compatibilidad)
      stripeCustomerId,
      stripeSubscriptionId
    } = subscriptionData;

    try {
      const upsertData = {
        user_id: userId,
        plan_id: planId,
        payment_provider: paymentProvider || PAYMENT_PROVIDERS.NONE,
        provider_customer_id: providerCustomerId,
        provider_subscription_id: providerSubscriptionId,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      };

      // Añadir campos específicos según el proveedor
      if (paymentProvider === PAYMENT_PROVIDERS.MERCADOPAGO) {
        upsertData.mercadopago_preapproval_id = mercadopagoPreapprovalId;
        upsertData.mercadopago_payer_id = mercadopagoPayerId;
      } else if (paymentProvider === PAYMENT_PROVIDERS.PAYPAL) {
        upsertData.paypal_subscription_id = paypalSubscriptionId;
        upsertData.paypal_payer_id = paypalPayerId;
      } else if (paymentProvider === PAYMENT_PROVIDERS.STRIPE) {
        // Compatibilidad con código existente de Stripe
        upsertData.stripe_customer_id = stripeCustomerId;
        upsertData.stripe_subscription_id = stripeSubscriptionId;
      }

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(upsertData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error en upsertSubscription:', error);
      throw error;
    }
  }

  /**
   * Cancela suscripción
   * @param {string} userId 
   */
  async cancelSubscription(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      throw error;
    }
  }

  /**
   * Obtiene el ID del plan por nombre
   * @param {string} planName 
   * @returns {string|null}
   */
  async getPlanIdByName(planName) {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .eq('name', planName)
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error obteniendo plan ID:', error);
      return null;
    }
  }

  /**
   * Obtiene el plan con los IDs de todos los proveedores
   * @param {string} planName 
   * @returns {Object|null}
   */
  async getPlanWithProviderIds(planName) {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, name, price_cents, monthly_queries, stripe_price_id, mercadopago_plan_id, paypal_plan_id')
        .eq('name', planName)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo plan con provider IDs:', error);
      return null;
    }
  }

  /**
   * Obtiene el ID del plan en un proveedor específico
   * @param {string} planName 
   * @param {string} provider - 'mercadopago', 'paypal', 'stripe'
   * @returns {string|null}
   */
  async getPlanProviderIdByName(planName, provider) {
    const plan = await this.getPlanWithProviderIds(planName);
    if (!plan) return null;

    switch (provider) {
      case PAYMENT_PROVIDERS.MERCADOPAGO:
        return plan.mercadopago_plan_id;
      case PAYMENT_PROVIDERS.PAYPAL:
        return plan.paypal_plan_id;
      case PAYMENT_PROVIDERS.STRIPE:
        return plan.stripe_price_id;
      default:
        return null;
    }
  }

  /**
   * Registra una transacción de pago
   * @param {Object} transactionData 
   * @returns {Object}
   */
  async logTransaction(transactionData) {
    const {
      userId,
      subscriptionId,
      paymentProvider,
      providerTransactionId,
      providerPaymentId,
      transactionType,
      amountCents,
      currency = 'USD',
      status,
      providerResponse,
      metadata
    } = transactionData;

    try {
      const { data, error } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          user_id: userId,
          subscription_id: subscriptionId,
          payment_provider: paymentProvider,
          provider_transaction_id: providerTransactionId,
          provider_payment_id: providerPaymentId,
          transaction_type: transactionType,
          amount_cents: amountCents,
          currency,
          status,
          provider_response: providerResponse,
          metadata,
          processed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registrando transacción:', error);
      throw error;
    }
  }

  /**
   * Obtiene el proveedor de pago de la suscripción de un usuario
   * @param {string} userId 
   * @returns {string|null}
   */
  async getUserPaymentProvider(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('payment_provider')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) return null;
      return data?.payment_provider || null;
    } catch (error) {
      console.error('Error obteniendo payment provider:', error);
      return null;
    }
  }

  /**
   * Obtiene historial de transacciones de un usuario
   * @param {string} userId 
   * @param {number} limit 
   * @returns {Array}
   */
  async getUserTransactions(userId, limit = 10) {
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo transacciones:', error);
      return [];
    }
  }
}

export default new SubscriptionService();