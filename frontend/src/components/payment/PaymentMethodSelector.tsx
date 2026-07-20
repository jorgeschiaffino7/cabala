import { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { PAYMENT_PROVIDERS, type PaymentProvider, type PlanName } from '@/utils/constants';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';

interface PaymentMethodSelectorProps {
  planName: PlanName;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const PROVIDER_INFO = {
  [PAYMENT_PROVIDERS.MERCADOPAGO]: {
    name: 'Mercado Pago',
    description: 'Tarjetas de crédito/débito, transferencia bancaria',
    icon: '💳',
    color: 'bg-blue-500',
  },
  [PAYMENT_PROVIDERS.PAYPAL]: {
    name: 'PayPal',
    description: 'PayPal, tarjetas de crédito internacionales',
    icon: '🅿️',
    color: 'bg-indigo-500',
  },
};

export const PaymentMethodSelector = ({ 
  planName, 
  onSuccess, 
  onError 
}: PaymentMethodSelectorProps) => {
  const { paymentProviders, upgradeToPlan, userCountry } = useSubscription();
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(
    paymentProviders?.recommended || null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (!selectedProvider) return;

    setIsLoading(true);
    try {
      await upgradeToPlan(planName, selectedProvider);
      onSuccess?.();
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentProviders) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Selecciona tu método de pago
        </h3>
        <p className="text-sm text-gray-500">
          {userCountry && `País detectado: ${userCountry}`}
        </p>
      </div>

      <div className="space-y-3">
        {paymentProviders.providers.map((provider) => {
          const info = PROVIDER_INFO[provider.id as keyof typeof PROVIDER_INFO];
          if (!info) return null;

          const isSelected = selectedProvider === provider.id;
          const isRecommended = provider.recommended;

          return (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${isSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {info.name}
                      </span>
                      {isRecommended && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{info.description}</p>
                  </div>
                </div>
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? 'border-indigo-500' : 'border-gray-300'}
                `}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handlePayment}
        disabled={!selectedProvider || isLoading}
        isLoading={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Procesando...' : 'Continuar al pago'}
      </Button>

      <p className="text-xs text-center text-gray-500">
        Serás redirigido a {selectedProvider && PROVIDER_INFO[selectedProvider as keyof typeof PROVIDER_INFO]?.name} 
        para completar el pago de forma segura.
      </p>
    </div>
  );
};

export default PaymentMethodSelector;
