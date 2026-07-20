import { useState, useEffect } from 'react';
import { queryService } from '@/services/query.service';
import type { QueryHistoryItem, QueryDetail } from '@/services/query.service';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { getErrorMessage } from '@/utils/helpers';

interface UseHistoryReturn {
  history: QueryHistoryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (currentOffset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const { data, hasMore: more } = await queryService.getHistory(
        DEFAULT_PAGE_SIZE,
        currentOffset
      );

      if (currentOffset === 0) {
        setHistory(data);
      } else {
        setHistory((prev) => [...prev, ...data]);
      }

      setHasMore(more);
      setOffset(currentOffset + DEFAULT_PAGE_SIZE);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      await loadHistory(offset);
    }
  };

  const refresh = async () => {
    setOffset(0);
    await loadHistory(0);
  };

  return {
    history,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

interface UseQueryDetailReturn {
  detail: QueryDetail | null;
  loading: boolean;
  error: string | null;
  loadDetail: (id: string) => Promise<void>;
}

export const useQueryDetail = (): UseQueryDetailReturn => {
  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const queryDetail = await queryService.getQueryById(id);
      setDetail(queryDetail);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    detail,
    loading,
    error,
    loadDetail,
  };
};