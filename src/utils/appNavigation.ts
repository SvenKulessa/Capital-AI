/** Case-insensitive pathname normalization with existing German/English aliases. */
export function resolveAppRoute(rawPath: string): string {
  if (!rawPath) return '/';
  const clean = rawPath.trim().toLowerCase().replace(/\/+$/, '') || '/';

  if (clean === '/login' || clean === '/anmelden' || clean === '/signin') {
    return '/login';
  }
  if (clean === '/faq' || clean === '/hilfe' || clean === '/questions') {
    return '/faq';
  }
  if (
    clean === '/datenschutz' ||
    clean === '/privacy' ||
    clean === '/privacy-policy' ||
    clean === '/datenschutzerklaerung'
  ) {
    return '/datenschutz';
  }
  if (
    clean === '/agb' ||
    clean === '/terms' ||
    clean === '/nutzungsbedingungen' ||
    clean === '/tos' ||
    clean === '/conditions'
  ) {
    return '/agb';
  }
  if (
    clean === '/impressum' ||
    clean === '/imprint' ||
    clean === '/anbieterkennzeichnung' ||
    clean === '/legal'
  ) {
    return '/impressum';
  }
  if (
    clean === '/learning' ||
    clean === '/learning-portal' ||
    clean === '/lernportal' ||
    clean === '/wissen' ||
    clean === '/vocabulary' ||
    clean === '/glossar' ||
    clean === '/lexikon' ||
    clean === '/market-vocabulary' ||
    clean === '/dictionary'
  ) {
    return '/learning';
  }
  if (
    clean === '/control-center' ||
    clean === '/control' ||
    clean === '/admin' ||
    clean === '/cost-center' ||
    clean === '/roadmap' ||
    clean === '/management' ||
    clean === '/gf' ||
    clean === '/founder-control'
  ) {
    return '/control-center';
  }
  if (
    clean === '/pricing' ||
    clean === '/preise' ||
    clean === '/tarife' ||
    clean === '/monetarisierung' ||
    clean === '/membership'
  ) {
    return '/pricing';
  }
  if (
    clean === '/whale-radar' ||
    clean === '/whales' ||
    clean === '/smart-money' ||
    clean === '/on-chain' ||
    clean === '/telegram'
  ) {
    return '/whale-radar';
  }
  if (
    clean === '/pipeline-builder' ||
    clean === '/builder' ||
    clean === '/pipeline-konfigurator' ||
    clean === '/data-pipeline' ||
    clean === '/pipeline'
  ) {
    return '/pipeline-builder';
  }
  if (
    clean === '/architecture' ||
    clean === '/architektur' ||
    clean === '/system-architecture' ||
    clean === '/kursdaten' ||
    clean === '/data-feed'
  ) {
    return '/architecture';
  }
  if (
    clean === '/tokenomics' ||
    clean === '/token' ||
    clean === '/cpt' ||
    clean === '/tokenomics-konzept' ||
    clean === '/token-economy'
  ) {
    return '/tokenomics';
  }
  if (
    clean === '/studio' ||
    clean === '/studio-hub' ||
    clean === '/founder' ||
    clean === '/founder-hub' ||
    clean === '/founder-suite' ||
    clean === '/founders' ||
    clean === '/founder-strategie'
  ) {
    return '/studio';
  }
  if (
    clean === '/marketscreener' ||
    clean === '/screener' ||
    clean === '/analyse-tools' ||
    clean === '/market-screener'
  ) {
    return '/marketscreener';
  }
  if (
    clean === '/provider-status' ||
    clean === '/providers' ||
    clean === '/admin/providers' ||
    clean === '/provider-fleet' ||
    clean === '/fleet'
  ) {
    return '/provider-status';
  }
  return '/';
}

export const APP_NAVIGATION_EVENT = 'capital-ai:navigation';

export function readHubTab<T extends string>(search: string, tabs: readonly T[], fallback: T): T {
  const value = new URLSearchParams(search).get('tab');
  return tabs.find(tab => tab === value) ?? fallback;
}

/** Normalize only the pathname; preserve query values and hash exactly. */
export function resolveNavigationTarget(target: string): string {
  const url = new URL(target, 'https://capital-ai.local');
  return resolveAppRoute(url.pathname) + url.search + url.hash;
}

/** pushState does not emit popstate, so notify SPA subscribers explicitly. */
export function navigateAppLocation(target: string): string {
  const href = resolveNavigationTarget(target);
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (href !== current) {
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event(APP_NAVIGATION_EVENT));
  }
  return resolveAppRoute(window.location.pathname);
}
