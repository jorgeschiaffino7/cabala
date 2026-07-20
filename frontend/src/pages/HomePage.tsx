import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { QueryPanel } from '@/components/query/QueryPanel';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';
import { ROUTES } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <PageLayout containerSize="lg">
      <section className="text-center mb-12">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-600 rounded-2xl mb-6">
          <span className="text-white font-bold text-3xl">ג</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Estudio de gematría con contexto académico
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Calcula valores gemátricos, encuentra textos relacionados en fuentes sagradas
          e interpreta los resultados con inteligencia artificial.
        </p>
        {!isAuthenticated && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg">Comenzar gratis</Button>
            </Link>
            <Link to={ROUTES.PRICING}>
              <Button variant="secondary" size="lg">Ver planes</Button>
            </Link>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          ['Cálculo preciso', 'Gematría hebrea determinista con normalización de nikud.'],
          ['Textos sagrados', 'Búsqueda en Torá, Zóhar y Sefer Yetzirah.'],
          ['Interpretación IA', 'Análisis contextual basado solo en datos reales.'],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Prueba una consulta</h2>
        <QueryPanel />
      </Card>
    </PageLayout>
  );
};
