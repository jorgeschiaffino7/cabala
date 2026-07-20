import { apiClient } from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import type { PlanName, SubscriptionStatus, PaymentProvider } from '@/utils/constants';

// Types for Subscription API responses
export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  price: number;
  priceCents: number;
  monthlyQueries: number | null;
  features: string[];
  isPopular?: boolean;
}

export interface CurrentSubscription {
  plan: {
    name: PlanName;
    monthlyQueries: number | null;
    queriesUsed: number;
    queriesRemaining: number | null;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    paymentProvider: PaymentProvider;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  isActive: boolean;
  isFree: boolean;
}

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  provider: PaymentProvider;
}

export interface PaymentProviderInfo {
  id: PaymentProvider;
  name: string;
  recommended: boolean;
}

export interface ProvidersResponse {
  country: string;
  providers: PaymentProviderInfo[];
  recommended: PaymentProvider;
}

export interface Transaction {
  id: string;
  type: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PlansResponse {
  success: boolean;
  data: SubscriptionPlan[];
}

interface CurrentSubscriptionResponse {
  success: boolean;
  data: CurrentSubscription;
}

interface CheckoutResponse {
  success: boolean;
  data: CheckoutSession;
}

interface ProvidersApiResponse {
  success: boolean;
  data: ProvidersResponse;
}

interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
}

/**
 * Subscription Service - handles subscription and billing
 * Supports: Mercado Pago (LATAM) and PayPal (Global)
 */
class SubscriptionService {
  private userCountry: string | null = null;

  /**
   * Get all available plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await apiClient.get<PlansResponse>(API_ENDPOINTS.PLANS);
      return response.data;
    } catch (error) {
      console.error('Get plans error:', error);
      throw error;
    }
  }

  /**
   * Get current user subscription
   */
  async getCurrentSubscription(): Promise<CurrentSubscription> {
    try {
      const response = await apiClient.get<CurrentSubscriptionResponse>(
        API_ENDPOINTS.CURRENT_SUBSCRIPTION
      );
      return response.data;
    } catch (error) {
      console.error('Get current subscription error:', error);
      throw error;
    }
  }

  /**
   * Get available payment providers for user's country
   */
  async getPaymentProviders(countryCode?: string): Promise<ProvidersResponse> {
    try {
      const country = countryCode || this.userCountry || await this.detectCountry();
      const response = await apiClient.get<ProvidersApiResponse>(
        `${API_ENDPOINTS.PROVIDERS}?country=${country}`
      );
      return response.data;
    } catch (error) {
      console.error('Get payment providers error:', error);
      throw error;
    }
  }

  /**
   * Create checkout session with specified or auto-detected provider
   */
  async createCheckoutSession(
    planName: PlanName,
    provider?: PaymentProvider,
    countryCode?: string
  ): Promise<CheckoutSession> {
    try {
      const country = countryCode || this.userCountry || await this.detectCountry();
      const response = await apiClient.post<CheckoutResponse>(
        API_ENDPOINTS.CREATE_CHECKOUT,
        { 
          planName,
          provider,
          countryCode: country
        }
      );
      return response.data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  }

  /**
   * Redirect to checkout with the appropriate provider
   */
  async redirectToCheckout(
    planName: PlanName,
    provider?: PaymentProvider
  ): Promise<void> {
    try {
      const session = await this.createCheckoutSession(planName, provider);
      window.location.href = session.checkoutUrl;
    } catch (error) {
      console.error('Redirect to checkout error:', error);
      throw error;
    }
  }

  /**
   * Cancel current subscription
   */
  async cancelSubscription(reason?: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.CANCEL_SUBSCRIPTION, { reason });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Pause current subscription
   */
  async pauseSubscription(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.PAUSE_SUBSCRIPTION);
    } catch (error) {
      console.error('Pause subscription error:', error);
      throw error;
    }
  }

  /**
   * Resume paused subscription
   */
  async resumeSubscription(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.RESUME_SUBSCRIPTION);
    } catch (error) {
      console.error('Resume subscription error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit = 10): Promise<Transaction[]> {
    try {
      const response = await apiClient.get<TransactionsResponse>(
        `${API_ENDPOINTS.TRANSACTIONS}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  }

  /**
   * Detect user's country using free IP geolocation
   */
  async detectCountry(): Promise<string> {
    if (this.userCountry) return this.userCountry;

    try {
      const response = await fetch('https://ipapi.co/country_code/');
      if (response.ok) {
        this.userCountry = await response.text();
        return this.userCountry;
      }
    } catch (error) {
      console.warn('Could not detect country:', error);
    }

    return 'US';
  }

  /**
   * Set user country manually
   */
  setUserCountry(countryCode: string): void {
    this.userCountry = countryCode.toUpperCase();
  }

  /**
   * Get cached user country
   */
  getUserCountry(): string | null {
    return this.userCountry;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

export default subscriptionService;