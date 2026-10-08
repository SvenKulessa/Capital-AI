import { useEffect, useState } from 'react';
import {
  APP_NAVIGATION_EVENT,
  navigateAppLocation,
} from '../../utils/appNavigation';
export function useAnalysisQuery(key: string, fallback = '') {
  const read = () =>
    typeof window === 'undefined'
      ? fallback
      : (new URLSearchParams(window.location.search).get(key) ?? fallback);
  const [value, setValue] = useState(read);
  useEffect(() => {
    const sync = () => setValue(read());
    window.addEventListener('popstate', sync);
    window.addEventListener(APP_NAVIGATION_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(APP_NAVIGATION_EVENT, sync);
    };
  }, [key, fallback]);
  const update = (next: string) => {
    const params = new URLSearchParams(window.location.search);
    if (next === fallback || !next) params.delete(key);
    else params.set(key, next);
    navigateAppLocation(
      window.location.pathname +
        (params.size ? '?' + params.toString() : '') +
        window.location.hash,
    );
  };
  return [value, update] as const;
}
