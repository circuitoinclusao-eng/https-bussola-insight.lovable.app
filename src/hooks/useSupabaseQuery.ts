import { useCallback, useEffect, useState } from 'react';
import { IMPORT_COMPLETED_EVENT } from '../lib/events';

export function useSupabaseQuery<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback((mounted: () => boolean) => {
    setLoading(true);
    setError(null);
    loader()
      .then((result) => mounted() && setData(result))
      .catch((err: Error) => mounted() && setError(err.message))
      .finally(() => mounted() && setLoading(false));
  }, deps);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;
    const refreshAfterImport = () => loadData(isMounted);
    loadData(isMounted);
    window.addEventListener(IMPORT_COMPLETED_EVENT, refreshAfterImport);
    return () => {
      mounted = false;
      window.removeEventListener(IMPORT_COMPLETED_EVENT, refreshAfterImport);
    };
  }, [loadData]);

  return { data, loading, error };
}
