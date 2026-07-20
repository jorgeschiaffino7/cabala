import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Loading } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Alert } from '@/components/common/Alert';
import { useHistory } from '@/hooks/useHistory';
import { formatRelativeTime, formatNumber } from '@/utils/formatters';

export const HistoryPage = () => {
  const { history, loading, error, hasMore, loadMore } = useHistory();

  return (
    <PageLayout
      title="Historial"
      description="Tus consultas anteriores de gematría."
    >
      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      {loading && history.length === 0 ? (
        <Loading text="Cargando historial..." />
      ) : history.length === 0 ? (
        <EmptyState
          title="Sin consultas todavía"
          description="Cuando realices consultas autenticado, aparecerán aquí."
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.input_text}</p>
                    {item.translated_hebrew && (
                      <p className="hebrew-text mt-2">{item.translated_hebrew}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="info">
                        Gematría: {formatNumber(item.gematria_value)}
                      </Badge>
                      <Badge variant="default">{item.plan_used}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && (
            <div className="text-center">
              <Button variant="secondary" onClick={loadMore} isLoading={loading}>
                Cargar más
              </Button>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};
