import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Alert } from '@/components/common/Alert';
import { Loading } from '@/components/common/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useToast } from '@/context/ToastContext';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

export const SettingsPage = () => {
  const { user } = useAuth();
  const {
    currentSubscription,
    loading,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    refreshSubscription,
  } = useSubscription();
  const { success, error: showError, promise } = useToast();

  const handleCancel = async () => {
    if (!confirm('¿Seguro que deseas cancelar tu suscripción?')) return;

    try {
      await promise(cancelSubscription('Cancelado por el usuario'), {
        loading: 'Cancelando suscripción...',
        success: 'Suscripción cancelada',
        error: 'Error al cancelar',
      });
    } catch {
      showError('No se pudo cancelar la suscripción');
    }
  };

  const handlePause = async () => {
    try {
      await pauseSubscription();
      await refreshSubscription();
      success('Suscripción pausada');
    } catch {
      showError('Error al pausar la suscripción');
    }
  };

  const handleResume = async () => {
    try {
      await resumeSubscription();
      await refreshSubscription();
      success('Suscripción reanudada');
    } catch {
      showError('Error al reanudar la suscripción');
    }
  };

  return (
    <PageLayout title="Configuración" description="Administra tu cuenta y suscripción.">
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="font-medium">{user?.user_metadata?.full_name || 'Usuario'}</p>
            <p className="text-sm text-gray-600 mt-4">Email</p>
            <p className="font-medium">{user?.email}</p>
          </CardContent>
        </Card>

        {loading ? (
          <Loading text="Cargando suscripción..." />
        ) : currentSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle>Suscripción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">Plan: {currentSubscription.plan.name}</Badge>
                {currentSubscription.subscription && (
                  <Badge variant="default">
                    {currentSubscription.subscription.status}
                  </Badge>
                )}
              </div>

              {currentSubscription.subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-600">
                  Periodo actual hasta:{' '}
                  {formatDate(currentSubscription.subscription.currentPeriodEnd)}
                </p>
              )}

              {currentSubscription.isFree ? (
                <Link to={ROUTES.PRICING}>
                  <Button>Ver planes premium</Button>
                </Link>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={handlePause}>
                    Pausar
                  </Button>
                  <Button variant="secondary" onClick={handleResume}>
                    Reanudar
                  </Button>
                  <Button variant="danger" onClick={handleCancel}>
                    Cancelar suscripción
                  </Button>
                </div>
              )}

              {currentSubscription.subscription?.cancelAtPeriodEnd && (
                <Alert variant="warning">
                  Tu suscripción se cancelará al final del periodo actual.
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
};
