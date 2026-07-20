import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/utils/constants';

export const RegisterPage = () => {
  const { signUp, isAuthenticated, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await signUp(email, password, fullName);
    if (!result.success) {
      setError(result.error || 'Error al crear la cuenta');
    }

    setSubmitting(false);
  };

  return (
    <PageLayout containerSize="sm" showFooter={false}>
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Nombre completo"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              fullWidth
            />

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
              minLength={6}
              helperText="Mínimo 6 caracteres"
              fullWidth
            />

            <Button type="submit" fullWidth isLoading={submitting}>
              Registrarse
            </Button>
          </form>

          <p className="text-sm text-gray-600 text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
};
