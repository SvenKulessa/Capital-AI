import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APP_NAVIGATION_EVENT,
  navigateAppLocation,
  resolveAppRoute,
} from './routes';

export type AnalysisRouteRequest = {
  requestId: number;
  tab: 'asset' | 'sector';
  ticker?: string;
  sectorId?: string;
} | null;

function readAnalysisRequest(requestId: number): AnalysisRouteRequest {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const analysis = params.get('analysis');
    const ticker = params.get('ticker') ?? undefined;
    const sectorId = params.get('sector') ?? undefined;

    if (!analysis && !ticker && !sectorId) return null;

    return {
      requestId,
      tab: analysis === 'sector' || sectorId ? 'sector' : 'asset',
      ticker,
      sectorId,
    };
  } catch {
    return null;
  }
}

export function useBrowserRoute() {
  const requestId = useRef(1);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return resolveAppRoute(window.location.pathname);
  });
  const [analysisRequest, setAnalysisRequest] =
    useState<AnalysisRouteRequest>(() => readAnalysisRequest(requestId.current));

  useEffect(() => {
    const syncFromLocation = () => {
      requestId.current += 1;
      setCurrentRoute(resolveAppRoute(window.location.pathname));
      setAnalysisRequest(readAnalysisRequest(requestId.current));
    };

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener(APP_NAVIGATION_EVENT, syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener(APP_NAVIGATION_EVENT, syncFromLocation);
    };
  }, []);

  const navigateTo = useCallback((path: string) => {
    const targetRoute = navigateAppLocation(path);
    setCurrentRoute(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    currentRoute,
    navigateTo,
    analysisRequest,
  };
}
