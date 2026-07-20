import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';

export const LoginPage = () => {
  const { signIn, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || ROUTES.DASHBOARD;

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await signIn(email, password);
    if (!result.success) {
      setError(result.error || 'Error al iniciar sesión');
    }

    setSubmitting(false);
  };

  return (
    <PageLayout containerSize="sm" showFooter={false}>
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
            />

            <Button type="submit" fullWidth isLoading={submitting}>
              Entrar
            </Button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-6">
            ¿No tienes cuenta?{' '}
            <Link to={ROUTES.REGISTER} className="text-blue-600 hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
};
