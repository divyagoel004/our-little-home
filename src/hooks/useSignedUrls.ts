import { useEffect, useState } from 'react';
import { signedUrls } from '../services/storage';

/** Resolves private storage paths to signed URLs (refreshed every 50 minutes). */
export function useSignedUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = [...new Set(paths.filter(Boolean) as string[])].sort().join('|');
  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length) return;
    let alive = true;
    const load = () =>
      signedUrls(list)
        .then((m) => alive && setUrls((prev) => ({ ...prev, ...m })))
        .catch(() => undefined);
    void load();
    const id = window.setInterval(load, 50 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [key]);
  return urls;
}
