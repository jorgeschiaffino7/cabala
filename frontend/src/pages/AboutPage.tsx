import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/common/Card';
import { APP_NAME } from '@/utils/constants';

export const AboutPage = () => {
  return (
    <PageLayout
      title="Acerca de"
      description={`Conoce más sobre ${APP_NAME}.`}
      containerSize="md"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              {APP_NAME} es un asistente de estudio académico para análisis de gematría
              hebrea e interpretación contextual de textos sagrados.
            </p>
            <p>
              Combina cálculo determinista, búsqueda en un corpus curado (Torá, Zóhar,
              Sefer Yetzirah) e interpretación con inteligencia artificial basada
              únicamente en los textos encontrados.
            </p>
            <p>
              No es un oráculo ni un sustituto del estudio tradicional. Las interpretaciones
              son orientativas y deben leerse con espíritu académico y respetuoso.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="font-semibold text-gray-900 mb-3">Metodología</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Normalización del texto hebreo (sin nikud)</li>
              <li>Cálculo del valor gemátrico</li>
              <li>Búsqueda de coincidencias en la base de datos</li>
              <li>Interpretación IA con datos verificados</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
