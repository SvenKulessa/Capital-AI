/** Seven base colours for product orientation. Per-asset shades retain individual identities.
 * These colours are decoration only: status and gains/losses require text and icons. */
export const BRAND_COLORS = Object.freeze({
  cyan: '#67E8F9',
  violet: '#B794F4',
  gold: '#F9BF21',
  pink: '#F9A8D4',
  rose: '#F87171',
  blue: '#60A5FA',
  green: '#4ADE80',
});

export const HUB_BRANDING = Object.freeze({
  marketscreener: { name: 'Analytics Hub', color: BRAND_COLORS.violet },
  studio: { name: 'Studio Hub', color: BRAND_COLORS.green },
  learning: { name: 'Learning Hub', color: BRAND_COLORS.gold },
  documentation: { name: 'Dokumentation Hub', color: BRAND_COLORS.blue, glow: 'rgba(16, 51, 135, 0.75)' },
  'control-center': { name: 'Control Center', color: BRAND_COLORS.rose },
  legal: { name: 'Rechtliches', color: BRAND_COLORS.cyan },
});

/** Unique asset hues derived from the seven base colour families. */
export const ASSET_BRANDING = Object.freeze({
  KRYPTO: '#FDE047',     // gold
  AKTIEN: '#34D399',      // green shade, separate from Studio
  INDIZIES: '#A78BFA',  // violet
  FOREX: '#E879F9',     // pink
  ROHSTOFFE: '#FDBA74', // warm rose
});

const COLOR_WHEEL = Object.freeze(Object.values(BRAND_COLORS));
const HUB_WHEEL_OFFSET = Object.freeze({
  marketscreener: 1, studio: 6, learning: 2, documentation: 5, 'control-center': 4, legal: 0,
});
/** Each tab keeps its compact dimensions but gets a stable, distinct accent. */
export function hubTabAccent(hubId, index, pageId = '') {
  // Owner Cost Center never changes hue when navigation order changes.
  if (hubId === 'control-center' && pageId === 'cost_center') return BRAND_COLORS.rose;
  return COLOR_WHEEL[((HUB_WHEEL_OFFSET[hubId] ?? 0) + index) % COLOR_WHEEL.length];
}
export const LEGAL_ROUTE_BRANDING = Object.freeze({
  '/legal': BRAND_COLORS.blue,
  '/faq': BRAND_COLORS.cyan,
  '/datenschutz': BRAND_COLORS.green,
  '/agb': BRAND_COLORS.pink,
  '/impressum': BRAND_COLORS.gold,
  '/kontakt': BRAND_COLORS.violet,
  '/lizenz': BRAND_COLORS.pink,
  '/datenprovider-lizenzen': BRAND_COLORS.cyan,
  '/opensource-lizenzen': BRAND_COLORS.green,
});
export function legalPageAccent(path) {
  return LEGAL_ROUTE_BRANDING[path] ?? BRAND_COLORS.cyan;
}

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
