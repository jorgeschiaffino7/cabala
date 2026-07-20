import { useState } from 'react';
import { queryService } from '@/services/query.service';
import type { QueryResult } from '@/services/query.service';
import { useToast } from '@/context/ToastContext';
import { TOAST_MESSAGES } from '@/utils/constants';
import { getErrorMessage } from '@/utils/helpers';

interface UseQueryReturn {
  result: QueryResult | null;
  loading: boolean;
  error: string | null;
  submitQuery: (text: string) => Promise<void>;
  clearResult: () => void;
}

export const useQuery = (): UseQueryReturn => {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: showError, success: showSuccess } = useToast();

  const submitQuery = async (text: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryResult = await queryService.submitQuery(text);
      setResult(queryResult);
      showSuccess(TOAST_MESSAGES.QUERY_SUCCESS);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError(errorMessage);
      
      // Check if it's a limit reached error
      if (err.status === 403) {
        setError('Has alcanzado el límite de consultas. Actualiza tu plan para continuar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    result,
    loading,
    error,
    submitQuery,
    clearResult,
  };
};