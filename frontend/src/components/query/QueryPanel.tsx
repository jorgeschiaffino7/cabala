import { useState } from 'react';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { useQuery } from '@/hooks/useQuery';
import { QueryResults } from './QueryResults';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';

export const QueryPanel = () => {
  const [text, setText] = useState('');
  const { result, loading, error, submitQuery, clearResult } = useQuery();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await submitQuery(text.trim());
  };

  const handleClear = () => {
    setText('');
    clearResult();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Texto en hebreo"
          placeholder="Escribe o pega un texto en hebreo para analizar..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          fullWidth
          helperText="Máximo 500 caracteres. El texto debe contener caracteres hebreos."
          disabled={loading}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" isLoading={loading} disabled={!text.trim()}>
            Analizar
          </Button>
          {(result || error) && (
            <Button type="button" variant="secondary" onClick={handleClear}>
              Limpiar
            </Button>
          )}
        </div>
      </form>

      {error && (
        <Alert variant="error" title="Error en la consulta">
          {error}
          {error.includes('límite') && (
            <div className="mt-3">
              <Link to={ROUTES.PRICING} className="text-blue-600 hover:underline font-medium">
                Ver planes disponibles
              </Link>
            </div>
          )}
        </Alert>
      )}

      {result && <QueryResults result={result} />}
    </div>
  );
};
