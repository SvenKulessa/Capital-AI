import { HUB_ROUTES } from '../shared/hub-routes.mjs';
import { BRAND_COLORS, HUB_BRANDING, ASSET_BRANDING, hubTabAccent, legalPageAccent } from '../shared/hub-branding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_NAVIGATION_EVENT, navigateAppLocation, readHubTab, resolveNavigationTarget, resolveAppRoute, CONTROL_CENTER_SECTION_IDS } from '../src/utils/appNavigation.ts';
import { messages } from '../src/i18n/messages.ts';

test('all current sideboard tab links retain their hub and tab', () => {
  for (const route of HUB_ROUTES) {
    assert.equal(resolveAppRoute(route.path), route.hub);
    assert.equal(resolveNavigationTarget(route.hub + '?tab=' + route.tab), route.path);
  }
});

test('footer consolidates public license navigation into documentation', () => {
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(footer, /href="\/dokumentation"|href="\/blog"|t\('docs'\)/);
  assert.match(footer, /OPEN_COOKIE_PREFERENCES_EVENT/);
});

test('aliases and trailing slash normalize without losing query or hash', () => {
  assert.equal(resolveNavigationTarget('/STUDIO-HUB/?tab=builder&ref=menu#details'), '/studio?tab=builder&ref=menu#details');
  assert.equal(resolveNavigationTarget('/lernportal?tab=quiz'), '/learning?tab=quiz');
  assert.equal(resolveNavigationTarget('/glossar'), '/vocabulary');
  assert.equal(resolveNavigationTarget('/vocabulary/mobile-pkce?ref=seo#definition'), '/vocabulary/mobile-pkce?ref=seo#definition');
  assert.equal(resolveNavigationTarget('/roadmap?tab=console'), '/control-center?tab=console');
});

test('Architecture Intelligence has a dedicated public route and deep-link tabs', () => {
  assert.equal(resolveAppRoute('/architecture-hub'), '/architecture-hub');
  assert.equal(resolveAppRoute('/financial-intelligence'), '/architecture-hub');
  assert.equal(resolveNavigationTarget('/architecture-hub?tab=explainability'), '/architecture-hub?tab=explainability');
  const routes = readFileSync(new URL('../src/app/routing/AppRoutes.tsx', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../src/components/HubCatalog.tsx', import.meta.url), 'utf8');
  assert.match(routes, /IntelligenceArchitectureHub/);
  assert.match(catalog, /path: '\/architecture-hub'/);
});

test('Market Screener documentation aliases keep the dedicated blueprint documentation hub', () => {
  assert.equal(resolveAppRoute('/marketscreener/dokumentation'), '/marketscreener/dokumentation');
  assert.equal(resolveAppRoute('/MARKET-SCREENER/DOKUMENTATION/'), '/marketscreener/dokumentation');
  assert.equal(resolveAppRoute('/blueprint-dokumentation'), '/marketscreener/dokumentation');
});

test('central documentation aliases keep the documentation hub', () => {
  assert.equal(resolveAppRoute('/dokumentation'), '/dokumentation');
  assert.equal(resolveNavigationTarget('/documentation?ref=hub#byok'), '/dokumentation?ref=hub#byok');
  assert.equal(resolveNavigationTarget('/praesentationen?ref=menu'), '/dokumentation?ref=menu');
});

test('missing or invalid tab selects a safe default', () => {
  const tabs = ['glossar', 'guides', 'quiz'];
  assert.equal(readHubTab('?tab=quiz', tabs, 'glossar'), 'quiz');
  assert.equal(readHubTab('?tab=unknown', tabs, 'glossar'), 'glossar');
  assert.equal(readHubTab('', tabs, 'glossar'), 'glossar');
});

test('same-hub transitions notify subscribers and avoid duplicate history', () => {
  const originalWindow = globalThis.window;
  const browser = new EventTarget();
  let href = new URL('https://capital-ai.local/studio?tab=architecture');
  let pushes = 0;
  let notifications = 0;
  Object.defineProperty(browser, 'location', { get: () => href });
  browser.history = { pushState(_state, _title, target) { pushes++; href = new URL(target, href); } };
  browser.addEventListener(APP_NAVIGATION_EVENT, () => notifications++);
  globalThis.window = browser;
  try {
    assert.equal(navigateAppLocation('/studio?tab=builder#canvas'), '/studio');
    assert.equal(href.pathname, '/studio/builder');
    assert.equal(href.search, '');
    assert.equal(href.hash, '#canvas');
    navigateAppLocation('/studio?tab=builder#canvas');
    assert.equal(pushes, 1);
    assert.equal(notifications, 1);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('license and legal deep links retain their destination and query state', () => {
  for (const route of ['/lizenz', '/datenprovider-lizenzen', '/opensource-lizenzen', '/impressum', '/datenschutz', '/agb']) {
    assert.equal(resolveAppRoute(route), route);
    assert.equal(resolveNavigationTarget(route.toUpperCase() + '/?ref=footer#details'), route + '?ref=footer#details');
  }
  assert.equal(resolveNavigationTarget('/academic-terms?provider=binance'), '/datenprovider-lizenzen?provider=binance');
  assert.equal(resolveAppRoute('/oss'), '/opensource-lizenzen');
  assert.equal(resolveAppRoute('/research'), '/');
  assert.equal(resolveAppRoute('/forschung'), '/');
  assert.equal(resolveAppRoute('/__proto__'), '/');
});


test('vocabulary keeps a dedicated canonical landing route and stable term detail paths', () => {
  assert.equal(resolveAppRoute('/vocabulary'), '/vocabulary');
  assert.equal(resolveAppRoute('/GLOSSAR/'), '/vocabulary');
  assert.equal(resolveAppRoute('/vocabulary/orderbuch/'), '/vocabulary/orderbuch');
  assert.equal(resolveAppRoute('/vocabulary/finance-voc-aidev-0001'), '/vocabulary/finance-voc-aidev-0001');
  assert.equal(resolveAppRoute('/vocabulary/not valid'), '/');
});

test('account routes keep profile, security and key vault as separate pages', () => {
  assert.equal(resolveAppRoute('/profile'), '/profile');
  assert.equal(resolveAppRoute('/security'), '/profile/security');
  assert.equal(resolveAppRoute('/profil/sicherheit'), '/profile/security');
  assert.equal(resolveAppRoute('/key-vault'), '/profile/key-vault');
  assert.equal(resolveAppRoute('/vault'), '/profile/key-vault');
  assert.equal(resolveAppRoute('/profil/workspace'), '/profile');
  assert.equal(resolveAppRoute('/mein-workspace'), '/profile');
  assert.equal(resolveNavigationTarget('/profile/security?ref=account'), '/profile/security?ref=account');
});


test('Control Center navigation is capability-gated to the verified owner session', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url),'utf8');
  assert.match(header, /verifiedOwner\(authSession\)/);
  assert.match(header, /hub.id !== 'control-center' \|\| isOwner/);
  assert.doesNotMatch(header, /<HubSidebarDrawer/);
});


test('production navigation does not expose runtime or unsupported MARKET claims', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../src/features/studio/StudioPage.tsx', import.meta.url), 'utf8');
  const routes = readFileSync(new URL('../src/app/routing/AppRoutes.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(header, /LIVE • Sub-45ms|Echtzeit-Feed:|Sub-45ms Latenz|SSL 256-Bit • MiCA/);
  assert.doesNotMatch(header, /sub\.trending/);
  assert.doesNotMatch(studio, /Sub-45ms Active|STUDIO HUB v2\.5/);
  assert.match(routes, /title="Provider-Status"/);
  assert.match(routes, /freigegebene öffentliche Runtime-, Provider- und Health-Evidence/);
  assert.doesNotMatch(routes, /<ProviderStatusDashboard/);
});

test('primary mobile navigation exposes dialog semantics and state', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  assert.match(header, /aria-expanded=\{isMenuOpen\}/);
  assert.match(header, /aria-controls="capital-ai-mobile-navigation"/);
  assert.match(header, /id="capital-ai-mobile-navigation"/);
  assert.match(header, /role="dialog"/);
  assert.match(header, /aria-modal="true"/);
  assert.match(header, /aria-label="Hauptnavigation"/);
});

test('canonical product routes and aliases resolve deterministically', () => {
  const cases = new Map([
    ['/screener', '/marketscreener'],
    ['/market-screener', '/marketscreener'],
    ['/builder', '/pipeline-builder'],
    ['/architektur', '/architecture'],
    ['/docs', '/dokumentation'],
    ['/providers', '/provider-status'],
    ['/preise', '/pricing'],
    ['/konto', '/profile'],
    ['/security', '/profile/security'],
    ['/vault', '/profile/key-vault'],
  ]);
  for (const [alias, canonical] of cases) assert.equal(resolveAppRoute(alias), canonical);
});


test('production navigation uses Preiskatalog and clickable canonical breadcrumbs', () => {
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url),'utf8');
  const breadcrumbs = readFileSync(new URL('../src/components/RouteBreadcrumbs.tsx', import.meta.url),'utf8');
  assert.match(footer, /t\('pricing'\)/);
  assert.equal(messages.de.pricing, 'Preiskatalog');
  assert.match(breadcrumbs, /aria-current="page"/);
});

test('hub sideboard hides raw URL paths in subpage cards while keeping navigation', () => {
  const panel = readFileSync(new URL('../src/components/HubNavigationPanel.tsx', import.meta.url),'utf8');
  assert.doesNotMatch(panel, />\s*\{\s*page\.path\s*\}\s*</);
  assert.match(panel, /href=\{page.path\}/);
});

test('homepage hub directory shares the canonical catalog and excludes protected routes by default', () => {
  const directory = readFileSync(new URL('../src/components/HomeHubDirectory.tsx', import.meta.url), 'utf8');
  assert.match(directory, /MAIN_HUBS_CONFIG/);
  assert.match(directory, /onNavigate\(hub.mainPath\)/);
  assert.doesNotMatch(directory, /aria-expanded|control-center/);
});

test('documentation hub catalog links to the existing content instead of reopening the overview', () => {
  const catalog = readFileSync(new URL('../src/components/HubCatalog.tsx', import.meta.url), 'utf8');
  for (const route of ['/dokumentation/pipeline-architekturen','/dokumentation/preiskatalog','/dokumentation/domains']) assert.ok(catalog.includes(route));
  assert.match(catalog, /badge: 'PENDING'/);
  assert.match(catalog, /tab=blogs/);
});


test('Control Center offers eleven dedicated, keyboard-accessible routes and legacy query links', () => {
  const sidebar = readFileSync(new URL('../src/components/HubCatalog.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/components/ControlCenterPage.tsx', import.meta.url), 'utf8');
  const appRoutes = readFileSync(new URL('../src/app/routing/AppRoutes.tsx', import.meta.url), 'utf8');
  const destinations = [...sidebar.matchAll(/path: '(\/control-center\/[a-z_]+)'/g)].map((match) => match[1]);
  assert.equal(destinations.length, CONTROL_CENTER_SECTION_IDS.length);
  for (const id of CONTROL_CENTER_SECTION_IDS) {
    const canonical = '/control-center/' + id;
    assert.ok(destinations.includes(canonical), canonical);
    assert.equal(resolveAppRoute(canonical.toUpperCase() + '/'), canonical);
    assert.equal(resolveNavigationTarget('/control-center?tab=' + id), '/control-center?tab=' + id);
  }
  assert.equal(resolveAppRoute('/control-center/unknown'), '/');
  assert.match(appRoutes, /currentRoute\.startsWith\('\/control-center\/'\)/);
  assert.match(page, /HubNavigationPanel/);
  assert.doesNotMatch(page, /<select/);
  assert.match(page, /APP_NAVIGATION_EVENT/);
  assert.doesNotMatch(page, /role="tablist"/);
});

test('all dedicated Control Center documents retain owner-only server gating and private SEO', async () => {
  const server = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const { resolveSeoIndexingPolicy } = await import('../shared/seo-indexing-policy.mjs');
  assert.match(server, /OWNER_ONLY_UI_PATHS\.has\(publicPath\) \|\| publicPath\.startsWith\('\/control-center\/'\)/);
  for (const id of CONTROL_CENTER_SECTION_IDS) {
    assert.equal(resolveSeoIndexingPolicy('/control-center/' + id).classification, 'PRIVATE');
  }
});


test('Hub navigation entries use native focusable anchors for keyboard and modified clicks', () => {
  const panel = readFileSync(new URL('../src/components/HubNavigationPanel.tsx', import.meta.url),'utf8');
  assert.match(panel, /<a key=\{page.id\} href=\{page.path\}/);
  assert.match(panel, /e.metaKey/);
  const css = readFileSync(new URL('../src/index.css', import.meta.url),'utf8');
  assert.match(css, /\.hub-tab:focus-visible/);
  assert.match(panel, /aria-current/);
});


test('optional route breadcrumbs do not inflate the synchronous bootstrap chunk', () => {
  const shell = readFileSync(new URL('../src/app/AppShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /const RouteBreadcrumbs = lazy\(\(\) =>/);
  assert.match(shell, /import\('\.\.\/components\/RouteBreadcrumbs'\)/);
  assert.match(shell, /<Suspense fallback=\{null\}>[\s\S]*?<RouteBreadcrumbs/);
});

test('six non-indexed language roots resolve to the public homepage without exposing private routes', () => {
  for (const code of ['de','en','it','fr','pt','es']) {
    assert.equal(resolveAppRoute('/' + code + '/'), '/');
    assert.equal(resolveAppRoute('/' + code), '/');
    // Internal actions remain canonical (language choice is a client preference).
    assert.equal(resolveNavigationTarget('/' + code + '/'), '/');
  }
  for (const path of ['/en/profile','/fr/login','/it/agb','/pt/control-center']) {
    assert.equal(resolveAppRoute(path), '/');
  }
});

test('language switcher has a keyboard-accessible native select and shareable homepage URL', () => {
  const switcher = readFileSync(new URL('../src/components/LanguageSwitcher.tsx', import.meta.url), 'utf8');
  assert.match(switcher, /<select/);
  assert.match(switcher, /aria-label=\{t\('language'\)\}/);
  assert.match(switcher, /setLocale\(next\)/);
  assert.match(switcher, /window\.history\.replaceState/);
});

test('sign-in password guidance matches current client-side strength policy', () => {
  const source = readFileSync(new URL('../src/features/auth/LoginPage.tsx', import.meta.url), 'utf8');
  const dictionary = readFileSync(new URL('../src/i18n/authCopy.ts', import.meta.url), 'utf8');
  assert.match(source, /newPasswordMeetsObservedPolicy/);
  assert.match(source, /tr\.passwordRules/);
  assert.match(source, /tr\.resetRules/);
  assert.doesNotMatch(source, /erzwingt keine künstlichen/);
  assert.match(dictionary, /special character/);
});

test('paused price alerts cannot render navigation or run background price checks', () => {
  const flag = readFileSync(new URL('../src/features/alerts/featureFlags.ts', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../src/components/HubCatalog.tsx', import.meta.url), 'utf8');
  const context = readFileSync(new URL('../src/context/PriceAlertsContext.tsx', import.meta.url), 'utf8');
  const overlays = readFileSync(new URL('../src/app/AppOverlays.tsx', import.meta.url), 'utf8');
  const buddy = readFileSync(new URL('../src/components/HeroBuddy.tsx', import.meta.url), 'utf8');

  assert.match(flag, /export const PRICE_ALERTS_ENABLED = false;/);
  assert.doesNotMatch(header, /PRICE ALERTS BELL BUTTON|title="PriceAlerts & Schwellenwerte"/);
  assert.doesNotMatch(readFileSync(new URL('../src/components/HubNavigationPanel.tsx', import.meta.url),'utf8'), /price-alerts/);
  assert.match(overlays, /\{PRICE_ALERTS_ENABLED && \(\s*<PriceAlertsModal/);
  assert.match(buddy, /\.\.\.\(PRICE_ALERTS_ENABLED \? \[\{ label: 'Alerts'/);
  assert.match(context, /if \(!PRICE_ALERTS_ENABLED\) return \[\];/);
  assert.match(context, /if \(!PRICE_ALERTS_ENABLED\) throw new Error\('PRICE_ALERTS_PAUSED'\)/);
  assert.match(context, /if \(!PRICE_ALERTS_ENABLED\) return;\s*const intervalSec/);
  assert.match(context, /if \(!PRICE_ALERTS_ENABLED\) return;\s*try \{\s*localStorage\.setItem\(STORAGE_ALERTS_KEY/);
});

test('hero uses restored static artwork and shared product disclaimer', () => {
  const hero = readFileSync(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8');
  assert.match(hero, /glowing_earth_nodes_1789997454893.jpg/);
  assert.doesNotMatch(hero, /HeroEarth3D|enableWebGL|WebGLRenderer/);
  assert.match(hero, /opacity-95/);
  assert.match(hero, /ProductDisclaimer/);
});

test('legal overview, contact, mobile hub tabs and global footer use one contact entry', () => {
  for (const route of ['/legal', '/kontakt', '/faq', '/datenschutz', '/agb', '/impressum']) {
    assert.equal(resolveAppRoute(route.toUpperCase() + '/'), route);
  }
  assert.equal(resolveAppRoute('/contact'), '/kontakt');
  assert.equal(resolveAppRoute('/rechtliches'), '/legal');
  assert.equal(resolveNavigationTarget('/legal?ref=footer'), '/legal?ref=footer');
  const viewport = readFileSync(new URL('../src/app/layout/ApplicationViewport.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  const legal = readFileSync(new URL('../src/components/LegalAndFaqPages.tsx', import.meta.url), 'utf8');
  const learning = readFileSync(new URL('../src/features/learning/LearningPortalPage.tsx', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../src/features/studio/StudioPage.tsx', import.meta.url), 'utf8');
  const market = readFileSync(new URL('../src/features/analysis/EnterpriseAnalysisHub.tsx', import.meta.url), 'utf8');
  const form = readFileSync(new URL('../src/components/ContactForm.tsx', import.meta.url), 'utf8');
  assert.match(viewport, /<Footer onNavigate=\{onNavigate\}/);
  assert.doesNotMatch(home, /<Footer /);
  for (const label of ['footer-nav-legal', 'footer-nav-kontakt', 'footer-nav-faq', 'footer-nav-datenschutz', 'footer-nav-agb', 'footer-nav-impressum']) {
    assert.ok(footer.includes(label), label);
  }
  assert.match(legal, /route === '\/kontakt' && <ContactForm \/>/);
  for (const target of ['/datenschutz/', '/agb/', '/impressum/']) assert.ok(legal.includes(`href="${target}"`), target);
  assert.match(learning, /activeTab === 'kontakt' && <ContactForm \/>/);
  assert.match(studio, /activeTab === 'kontakt' && <ContactForm \/>/);
  assert.match(market, /active === 'kontakt' && <ContactForm \/>/);
  assert.doesNotMatch(learning, /<LearningInquiry \/>/);
  assert.match(form, /\/api\/public\/contact/);
  for (const source of [learning, studio, market]) assert.match(source, /HubNavigationPanel/);
});


test('Chart atlas is not embedded or explicitly advertised on the public homepage', () => {
  const home = readFileSync(new URL('../src/features/home/LearningCadsShowcase.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(home, /ChartLessonGraphic|CHART_LESSONS|Chart-Lernatlas|\/learning\/chart-lernatlas/);
  const directory = readFileSync(new URL('../src/components/HomeHubDirectory.tsx', import.meta.url),'utf8');
  assert.match(directory, /'learning'/);
});


test('seven-brand system assigns distinct hub and asset accents without changing semantic status', () => {
  const foundations = Object.values(BRAND_COLORS);
  assert.equal(foundations.length, 7);
  assert.equal(new Set(foundations).size, 7);
  for (const color of [...foundations, ...Object.values(ASSET_BRANDING)]) assert.match(color, /^#[0-9A-F]{6}$/i);
  assert.equal(Object.keys(ASSET_BRANDING).length, 5);
  assert.equal(new Set(Object.values(ASSET_BRANDING)).size, 5);
  const hubAccents = Object.values(HUB_BRANDING).map(hub => hub.color);
  assert.equal(new Set(hubAccents).size, hubAccents.length);
  assert.equal(new Set([...hubAccents, ...Object.values(ASSET_BRANDING)]).size, hubAccents.length + 5);
  for (const hubId of Object.keys(HUB_BRANDING)) {
    assert.equal(hubTabAccent(hubId, 0), HUB_BRANDING[hubId].color);
    assert.equal(new Set(Array.from({ length: 7 }, (_, index) => hubTabAccent(hubId, index))).size, 7);
  }
  const legalPaths = ['/legal', '/faq', '/datenschutz', '/agb', '/impressum', '/kontakt'];
  assert.equal(new Set(legalPaths.map(legalPageAccent)).size, legalPaths.length);
  assert.equal(legalPageAccent('/unknown'), BRAND_COLORS.blue);
});

test('mobile drawer escapes header stacking context and retains modal keyboard behaviour', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  assert.match(header, /createPortal\(/);
  assert.match(header, /<\\/AnimatePresence>, document\\.body\\)\\}/);
  assert.match(header, /z-\[100\]/);
  assert.match(header, /z-\[110\]/);
  assert.match(header, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(header, /event\.key === 'Escape'/);
  assert.match(header, /event\.key !== 'Tab'/);
  assert.match(header, /getElementById\('open-menu-btn'\)\?\.focus\(\)/);
  assert.match(header, /id="capital-ai-mobile-navigation"/);
  assert.match(header, /role="dialog"/);
});

test('per-subpage brand colouring keeps former hub tab dimensions and legal site variation', () => {
  const strip = readFileSync(new URL('../src/components/HubNavigationPanel.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const legal = readFileSync(new URL('../src/components/LegalAndFaqPages.tsx', import.meta.url), 'utf8');
  const licensing = readFileSync(new URL('../src/components/LicenseInformationPages.tsx', import.meta.url), 'utf8');
  assert.match(strip, /hubTabAccent\(hubId, index\)/);
  assert.match(strip, /className="hub-tab-strip"/);
  assert.match(css, /min-height:\s*44px;/);
  assert.match(css, /font-size:\s*1rem;/);
  assert.match(css, /padding:\s*\.5rem 1rem;/);
  assert.match(css, /--effective-tab-accent: var\(--tab-accent, var\(--hub-accent\)\)/);
  assert.match(legal, /data-legal-route=\{route\}/);
  assert.match(legal, /legalPageAccent\(item\.path\)/);
  assert.match(licensing, /legalPageAccent\(path\)/);
});
