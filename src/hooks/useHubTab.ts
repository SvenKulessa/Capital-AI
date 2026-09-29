import { useCallback, useEffect, useState } from 'react';
import { APP_NAVIGATION_EVENT, navigateAppLocation, readHubTab } from '../utils/appNavigation';

/** Keep header links, local tabs, reloads and back/forward on the same URL state. */
export function useHubTab<T extends string>(tabs: readonly T[], initialTab: T) {
  const read = useCallback(() => typeof window === 'undefined'
    ? initialTab
    : readHubTab(window.location.search, tabs, initialTab), [tabs, initialTab]);
  const [activeTab, setActiveTab] = useState<T>(read);

  useEffect(() => {
    const sync = () => setActiveTab(read());
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener(APP_NAVIGATION_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(APP_NAVIGATION_EVENT, sync);
    };
  }, [read]);

  const selectTab = useCallback((tab: T) => {
    if (!tabs.includes(tab)) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    navigateAppLocation(window.location.pathname + '?' + params.toString() + window.location.hash);
  }, [tabs]);

  return [activeTab, selectTab] as const;
}
