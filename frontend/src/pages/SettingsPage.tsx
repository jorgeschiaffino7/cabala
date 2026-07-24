import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Alert } from '@/components/common/Alert';
import { Loading } from '@/components/common/Spinner';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useToast } from '@/context/ToastContext';
import { Link } from 'react-router-dom';
import { ROUTES, PLAN_NAMES } from '@/utils/constants';
import { formatDate } from '@/utils/formatters';

type ModalType = 'cancel' | 'downgrade' | 'pause' | null;

export const SettingsPage = () => {
  const { user } = useAuth();
  const {
    currentSubscription,
    loading,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    downgradeToFree,
    refreshSubscription,
  } = useSubscription();
  const { success, error: showError } = useToast();
  
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const closeModal = () => {
    setActiveModal(null);
    setReason('');
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      await cancelSubscription(reason || 'Cancelado por el usuario');
      success('Suscripción cancelada correctamente');
      closeModal();
    } catch {
      showError('No se pudo cancelar la suscripción');
    } finally {
      setProcessing(false);
    }
  };

  const handleDowngrade = async () => {
    setProcessing(true);
    try {
      await downgradeToFree(reason || 'Downgrade a plan Free');
      success('Plan cambiado a Free correctamente');
      closeModal();
    } catch {
      showError('No se pudo cambiar el plan');
    } finally {
      setProcessing(false);
    }
  };

  const handlePause = async () => {
    setProcessing(true);
    try {
      await pauseSubscription();
      await refreshSubscription();
      success('Suscripción pausada');
      closeModal();
    } catch {
      showError('Error al pausar la suscripción');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async () => {
    setProcessing(true);
    try {
      await resumeSubscription();
      await refreshSubscription();
      success('Suscripción reanudada');
    } catch {
      showError('Error al reanudar la suscripción');
    } finally {
      setProcessing(false);
    }
  };

  const isPaused = currentSubscription?.subscription?.status === 'paused';
  const isAvanzado = currentSubscription?.plan.name === PLAN_NAMES.AVANZADO;
  const isEstudio = currentSubscription?.plan.name === PLAN_NAMES.ESTUDIO;

  return (
    <PageLayout title="Configuración" description="Administra tu cuenta y suscripción.">
      <div className="space-y-6 max-w-2xl">
        {/* Cuenta */}
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

        {/* Suscripción */}
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
                  <Badge 
                    variant={isPaused ? 'warning' : 'default'}
                  >
                    {isPaused ? 'Pausado' : currentSubscription.subscription.status}
                  </Badge>
                )}
              </div>

              {/* Info del periodo */}
              {currentSubscription.subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-600">
                  Periodo actual hasta:{' '}
                  <span className="font-medium">
                    {formatDate(currentSubscription.subscription.currentPeriodEnd)}
                  </span>
                </p>
              )}

              {/* Alerta de cancelación pendiente */}
              {currentSubscription.subscription?.cancelAtPeriodEnd && (
                <Alert variant="warning">
                  Tu suscripción se cancelará al final del periodo actual.
                </Alert>
              )}

              {/* Acciones según el plan */}
              {currentSubscription.isFree ? (
                <div className="pt-2">
                  <p className="text-sm text-gray-600 mb-3">
                    Estás en el plan gratuito con {currentSubscription.plan.monthlyQueries} consultas mensuales.
                  </p>
                  <Link to={ROUTES.PRICING}>
                    <Button>Ver planes premium</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Opciones de cambio de plan */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Cambiar plan</p>
                    <div className="flex flex-wrap gap-2">
                      {isAvanzado && (
                        <Link to={`${ROUTES.PRICING}?downgrade=estudio`}>
                          <Button variant="secondary" size="sm">
                            Cambiar a Estudio
                          </Button>
                        </Link>
                      )}
                      {(isAvanzado || isEstudio) && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setActiveModal('downgrade')}
                        >
                          Cambiar a Free
                        </Button>
                      )}
                      {isEstudio && (
                        <Link to={ROUTES.PRICING}>
                          <Button size="sm">
                            Upgrade a Avanzado
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Controles de suscripción */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Gestionar suscripción</p>
                    <div className="flex flex-wrap gap-2">
                      {isPaused ? (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={handleResume}
                          disabled={processing}
                        >
                          {processing ? 'Procesando...' : 'Reanudar suscripción'}
                        </Button>
                      ) : (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setActiveModal('pause')}
                        >
                          Pausar suscripción
                        </Button>
                      )}
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => setActiveModal('cancel')}
                      >
                        Cancelar suscripción
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Modal Cancelar */}
        <Modal
          isOpen={activeModal === 'cancel'}
          onClose={closeModal}
          title="Cancelar suscripción"
        >
          <div className="space-y-4">
            <Alert variant="warning">
              Al cancelar, perderás acceso a las funciones premium al final del periodo de facturación actual.
            </Alert>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Por qué cancelas? (opcional)
              </label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm"
                rows={3}
                placeholder="Cuéntanos cómo podemos mejorar..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>
                Volver
              </Button>
              <Button 
                variant="danger" 
                onClick={handleCancel}
                disabled={processing}
              >
                {processing ? 'Cancelando...' : 'Confirmar cancelación'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Downgrade */}
        <Modal
          isOpen={activeModal === 'downgrade'}
          onClose={closeModal}
          title="Cambiar a plan Free"
        >
          <div className="space-y-4">
            <Alert variant="info">
              Al cambiar a Free, tu suscripción actual se cancelará y tendrás acceso a 3 consultas mensuales.
            </Alert>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium">Plan Free incluye:</p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• 3 consultas mensuales</li>
                <li>• Acceso básico a gematría</li>
                <li>• Sin costo</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón del cambio (opcional)
              </label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm"
                rows={2}
                placeholder="Cuéntanos por qué cambias de plan..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>
                Volver
              </Button>
              <Button 
                onClick={handleDowngrade}
                disabled={processing}
              >
                {processing ? 'Procesando...' : 'Cambiar a Free'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Pausar */}
        <Modal
          isOpen={activeModal === 'pause'}
          onClose={closeModal}
          title="Pausar suscripción"
        >
          <div className="space-y-4">
            <Alert variant="info">
              Al pausar, no se te cobrará hasta que reanudes. Puedes reanudar en cualquier momento.
            </Alert>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeModal}>
                Volver
              </Button>
              <Button 
                onClick={handlePause}
                disabled={processing}
              >
                {processing ? 'Pausando...' : 'Pausar suscripción'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
};
