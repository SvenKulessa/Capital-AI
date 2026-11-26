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

/** Per-view design contract. Neutral surfaces, status semantics, immutable illustrations
 * and the seven-colour global identity stripe are not additional active UI accents. */
export const UNIVERSE_VIEW_BRANDING = Object.freeze({
  version: 'UNIVERSE_VIEW_BRANDING@2',
  designReference: 'owner-approved-first-layout-20261126',
  approvedWebColors: Object.freeze({ cyan: BRAND_COLORS.cyan, gold: BRAND_COLORS.gold, violet: BRAND_COLORS.violet, rose: BRAND_COLORS.rose }),
  minimumActiveColors: 2, maximumActiveColors: 4,
  pair: Object.freeze(['cyan', 'gold']),
  accent: Object.freeze(['violet', 'rose']),
  nebulaMaxViewportFraction: 0.20,
  canvasRelativeRgbLift: 0.08,
  canvas: '#081229',
  hubOrder: Object.freeze(['marketscreener', 'learning', 'studio']),
  studioNavigationTarget: '/',
  reducedMotion: 'static',
});

export const HUB_BRANDING = Object.freeze({
  marketscreener: { name: 'Analytics Hub', color: BRAND_COLORS.violet },
  studio: { name: 'Studio Hub', color: BRAND_COLORS.green },
  social: { name: 'Social Hub', color: BRAND_COLORS.pink },
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
  marketscreener: 1, studio: 6, social: 3, learning: 2, documentation: 5, 'control-center': 4, legal: 0,
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
  if (/^\/(social)(\/|$)/.test(path)) return 'social';
  if (/^\/(dokumentation|architecture|architecture-hub|financial-intelligence|lizenz|datenprovider-lizenzen|opensource-lizenzen)(\/|$)/.test(path)) return 'documentation';
  if (/^\/(studio|pipeline-builder)(\/|$)/.test(path)) return 'studio';
  if (/^\/(marketscreener|screener)(\/|$)/.test(path)) return 'marketscreener';
  if (/^\/(control-center|admin|roadmap|cost-center)(\/|$)/.test(path)) return 'control-center';
  if (/^\/(legal|faq|agb|datenschutz|impressum|kontakt)(\/|$)/.test(path)) return 'legal';
  return undefined;
}
