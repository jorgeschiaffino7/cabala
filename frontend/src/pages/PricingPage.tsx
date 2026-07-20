import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Loading } from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { subscriptionService, type SubscriptionPlan } from '@/services/subscription.service';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { PLAN_NAMES, ROUTES, type PlanName } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

export const PricingPage = () => {
  const { isAuthenticated } = useAuth();
  const { currentSubscription } = useSubscription();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);

  useEffect(() => {
    subscriptionService.getPlans()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = (planName: PlanName) => {
    if (planName === PLAN_NAMES.FREE) {
      navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.REGISTER);
      return;
    }

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }

    setSelectedPlan(planName);
  };

  const currentPlanName = currentSubscription?.plan.name;

  return (
    <PageLayout
      title="Planes"
      description="Elige el plan que mejor se adapte a tu estudio."
    >
      {loading ? (
        <Loading text="Cargando planes..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              variant={plan.isPopular ? 'elevated' : 'default'}
              className={plan.isPopular ? 'ring-2 ring-blue-500' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.isPopular && <Badge variant="info">Popular</Badge>}
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {plan.price === 0 ? 'Gratis' : formatCurrency(plan.priceCents)}
                  {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/mes</span>}
                </p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    {plan.monthlyQueries == null
                      ? 'Consultas ilimitadas'
                      : `${plan.monthlyQueries} consultas/mes`}
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  fullWidth
                  variant={currentPlanName === plan.name ? 'secondary' : 'primary'}
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={currentPlanName === plan.name}
                >
                  {currentPlanName === plan.name
                    ? 'Plan actual'
                    : plan.price === 0
                      ? 'Comenzar'
                      : 'Suscribirse'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <p className="text-center text-sm text-gray-600 mt-8">
          ¿Ya tienes cuenta?{' '}
          <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      )}

      <Modal
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={`Suscribirse al plan ${selectedPlan}`}
        size="lg"
      >
        {selectedPlan && (
          <PaymentMethodSelector
            planName={selectedPlan}
            onSuccess={() => setSelectedPlan(null)}
          />
        )}
      </Modal>
    </PageLayout>
  );
};
