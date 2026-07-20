import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { QueryPanel } from '@/components/query/QueryPanel';
import { Card, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Alert } from '@/components/common/Alert';
import { Loading } from '@/components/common/Spinner';
import { useSubscription } from '@/context/SubscriptionContext';
import { useToast } from '@/context/ToastContext';
import { ROUTES } from '@/utils/constants';

export const DashboardPage = () => {
  const { currentSubscription, loading, refreshSubscription } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success } = useToast();
  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    if (paymentStatus === 'success') {
      success('Pago procesado correctamente');
      refreshSubscription();
      setSearchParams({});
    }
  }, [paymentStatus, success, refreshSubscription, setSearchParams]);

  return (
    <PageLayout
      title="Dashboard"
      description="Realiza consultas de gematría y revisa tu plan actual."
    >
      {paymentStatus === 'pending' && (
        <Alert variant="warning" title="Pago pendiente" className="mb-6">
          Tu pago está siendo procesado. Actualizaremos tu plan en breve.
        </Alert>
      )}

      {loading ? (
        <Loading text="Cargando tu suscripción..." />
      ) : (
        currentSubscription && (
          <Card className="mb-6">
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info">Plan: {currentSubscription.plan.name}</Badge>
                {currentSubscription.plan.monthlyQueries != null ? (
                  <Badge variant="default">
                    {currentSubscription.plan.queriesUsed} / {currentSubscription.plan.monthlyQueries} consultas
                  </Badge>
                ) : (
                  <Badge variant="success">Consultas ilimitadas</Badge>
                )}
                {!currentSubscription.isFree && (
                  <Link to={ROUTES.PRICING} className="text-sm text-blue-600 hover:underline">
                    Cambiar plan
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}

      <QueryPanel />
    </PageLayout>
  );
};
