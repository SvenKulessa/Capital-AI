/** One stable role colour per hub. Financial gain/loss colours remain semantic. */
export const HUB_BRANDING = Object.freeze({
  marketscreener: { name: 'Analytics Hub', color: '#67E8F9' },
  studio: { name: 'Studio Hub', color: '#C4B5FD' },
  learning: { name: 'Learning Hub', color: '#F9BF21' },
  documentation: { name: 'Dokumentation Hub', color: '#F9A8D4' },
  'control-center': { name: 'Control Center', color: '#FDA4AF' },
  legal: { name: 'Rechtliches', color: '#93C5FD' },
});
export function hubBrandForRoute(route = '') {
  const path = route.split('?')[0];
  if (path === '/marketscreener/dokumentation') return 'documentation';
  if (/^\/(learning|vocabulary|glossar)(\/|$)/.test(path)) return 'learning';
  if (/^\/(dokumentation|architecture|lizenz|datenprovider-lizenzen|opensource-lizenzen)(\/|$)/.test(path)) return 'documentation';
  if (/^\/(studio|pipeline-builder|architecture-hub|financial-intelligence)(\/|$)/.test(path)) return 'studio';
  if (/^\/(marketscreener|screener)(\/|$)/.test(path)) return 'marketscreener';
  if (/^\/(control-center|admin|roadmap|cost-center)(\/|$)/.test(path)) return 'control-center';
  if (/^\/(legal|faq|agb|datenschutz|impressum|kontakt)(\/|$)/.test(path)) return 'legal';
  return undefined;
}
