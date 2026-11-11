import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { errorText } from '../lib/format';

let channelSeq = 0;

export interface Live<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** optimistic local replacement */
  set: (v: T) => void;
}

/**
 * Loads data and keeps it fresh: re-fetches whenever any of the listed tables
 * change (Supabase Realtime), when the tab becomes visible again, and on reload().
 * RLS still filters what each person is allowed to receive.
 */
export function useLive<T>(
  name: string,
  fetcher: () => Promise<T>,
  tables: string[],
  initial: T,
  enabled = true,
  deps: unknown[] = [],
): Live<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const alive = useRef(true);
  const timer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const v = await fetchRef.current();
      if (!alive.current) return;
      setData(v);
      setError(null);
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  const tablesKey = tables.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    setLoading(true);
    void reload();

    const debounced = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void reload(), 250);
    };
    let ch = supabase.channel(`${name}-${++channelSeq}`);
    for (const t of tablesKey.split(',').filter(Boolean)) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, debounced);
    }
    ch.subscribe();

    const onVis = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
      void supabase.removeChannel(ch);
    };
  }, [name, tablesKey, enabled, depsKey, reload]);

  return { data, loading, error, reload, set: setData };
}
