import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import type { QueryResult } from '@/services/query.service';
import { formatNumber } from '@/utils/formatters';

interface QueryResultsProps {
  result: QueryResult;
}

const getMatchedHebrew = (text: { hebrew?: string; textHebrew?: string }) =>
  text.hebrew || text.textHebrew || '';

export const QueryResults = ({ result }: QueryResultsProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Texto analizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">{result.input.original}</p>
            <p className="hebrew-text">{result.input.hebrew}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor gemátrico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">
              {formatNumber(result.gematria.value)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {result.gematria.letterCount} letras
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {result.input.breakdown.map((item) => (
                <Badge key={`${item.letter}-${item.value}`} variant="info">
                  {item.letter} = {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {result.matchedTexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Textos relacionados ({result.matchedTexts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.matchedTexts.map((text, index) => (
                <div
                  key={text.id ?? `${text.reference}-${index}`}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-gray-900">{text.reference}</p>
                  <p className="hebrew-text mt-2">{getMatchedHebrew(text)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Interpretación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {result.interpretation}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="default">Plan: {result.metadata.plan}</Badge>
            {result.metadata.queriesRemaining != null && (
              <Badge variant="info">
                Consultas restantes: {result.metadata.queriesRemaining}
              </Badge>
            )}
            <Badge variant="default">
              {result.metadata.processingTimeMs}ms
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
