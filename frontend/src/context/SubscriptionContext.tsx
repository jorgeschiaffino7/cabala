import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  subscriptionService, 
  type CurrentSubscription, 
  type SubscriptionPlan,
  type ProvidersResponse,
  type Transaction
} from '@/services/subscription.service';
import { useAuth } from './AuthContext';
import type { PaymentProvider, PlanName } from '@/utils/constants';

interface SubscriptionContextType {
  currentSubscription: CurrentSubscription | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  paymentProviders: ProvidersResponse | null;
  userCountry: string | null;
  refreshSubscription: () => Promise<void>;
  upgradeToPlan: (planName: PlanName, provider?: PaymentProvider) => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  pauseSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  downgradeToFree: (reason?: string) => Promise<void>;
  getTransactions: (limit?: number) => Promise<Transaction[]>;
  detectCountry: () => Promise<string>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentProviders, setPaymentProviders] = useState<ProvidersResponse | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    detectCountry();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionData();
    } else {
      setCurrentSubscription(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const detectCountry = useCallback(async (): Promise<string> => {
    try {
      const country = await subscriptionService.detectCountry();
      setUserCountry(country);
      const providers = await subscriptionService.getPaymentProviders(country);
      setPaymentProviders(providers);
      return country;
    } catch (error) {
      console.error('Detect country error:', error);
      setUserCountry('US');
      return 'US';
    }
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscription, availablePlans] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
      ]);
      setCurrentSubscription(subscription);
      setPlans(availablePlans);
    } catch (error) {
      console.error('Load subscription data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    try {
      const subscription = await subscriptionService.getCurrentSubscription();
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('Refresh subscription error:', error);
      throw error;
    }
  };

  const upgradeToPlan = async (planName: PlanName, provider?: PaymentProvider) => {
    try {
      await subscriptionService.redirectToCheckout(planName, provider);
    } catch (error) {
      console.error('Upgrade to plan error:', error);
      throw error;
    }
  };

  const cancelSubscription = async (reason?: string) => {
    try {
      await subscriptionService.cancelSubscription(reason);
      await refreshSubscription();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  };

  const pauseSubscription = async () => {
    try {
      await subscriptionService.pauseSubscription();
      await refreshSubscription();
    } catch (error) {
      console.error('Pause subscription error:', error);
      throw error;
    }
  };

  const resumeSubscription = async () => {
    try {
      await subscriptionService.resumeSubscription();
      await refreshSubscription();
    } catch (error) {
      console.error('Resume subscription error:', error);
      throw error;
    }
  };

  const downgradeToFree = async (reason?: string) => {
    try {
      await subscriptionService.downgradeToFree(reason);
      await refreshSubscription();
    } catch (error) {
      console.error('Downgrade subscription error:', error);
      throw error;
    }
  };

  const getTransactions = async (limit = 10): Promise<Transaction[]> => {
    try {
      return await subscriptionService.getTransactions(limit);
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  };

  const value: SubscriptionContextType = {
    currentSubscription,
    plans,
    loading,
    paymentProviders,
    userCountry,
    refreshSubscription,
    upgradeToPlan,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    downgradeToFree,
    getTransactions,
    detectCountry,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};