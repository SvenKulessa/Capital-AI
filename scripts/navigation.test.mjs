import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_NAVIGATION_EVENT, navigateAppLocation, readHubTab, resolveNavigationTarget, resolveAppRoute } from '../src/utils/appNavigation.ts';

test('all current sideboard tab links retain their hub and tab', () => {
  const sidebar = readFileSync(new URL('../src/components/HubSidebarDrawer.tsx', import.meta.url), 'utf8');
  const links = [...sidebar.matchAll(/path: '([^']+\?tab=[^']+)'/g)].map(match => match[1]);
  assert.equal(links.length, 23);
  assert.ok(links.includes('/studio?tab=console'));
  assert.ok(links.includes('/learning?tab=flashcards'));
  assert.ok(links.includes('/learning?tab=videos'));
  assert.ok(links.includes('/control-center?tab=tools'));
  assert.ok(links.includes('/control-center?tab=licenses'));
  for (const link of links) assert.equal(resolveNavigationTarget(link), link);
});

test('footer consolidates public license navigation into documentation', () => {
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  assert.match(footer, /href="\/dokumentation"/);
  assert.match(footer, /Dokumentation &amp; Lizenzen/);
  assert.doesNotMatch(footer, /href="\/control-center\?tab=licenses"/);
  assert.doesNotMatch(footer, /id="footer-nav-lizenz"/);
});

test('aliases and trailing slash normalize without losing query or hash', () => {
  assert.equal(resolveNavigationTarget('/STUDIO-HUB/?tab=builder&ref=menu#details'), '/studio?tab=builder&ref=menu#details');
  assert.equal(resolveNavigationTarget('/lernportal?tab=quiz'), '/learning?tab=quiz');
  assert.equal(resolveNavigationTarget('/glossar'), '/vocabulary');
  assert.equal(resolveNavigationTarget('/vocabulary/mobile-pkce?ref=seo#definition'), '/vocabulary/mobile-pkce?ref=seo#definition');
  assert.equal(resolveNavigationTarget('/roadmap?tab=console'), '/control-center?tab=console');
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
    assert.equal(href.search, '?tab=builder');
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
  assert.equal(resolveNavigationTarget('/profile/security?ref=account'), '/profile/security?ref=account');
});


test('Control Center navigation is capability-gated to the verified owner session', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../src/components/HubSidebarDrawer.tsx', import.meta.url), 'utf8');
  assert.match(header, /account\?\.iamRole === 'owner'/);
  assert.match(header, /allowControlCenter=\{isOwner\}/);
  assert.match(sidebar, /allowControlCenter = false/);
  assert.match(sidebar, /hubId !== 'control-center' \|\| allowControlCenter/);
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
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  const breadcrumbs = readFileSync(new URL('../src/components/RouteBreadcrumbs.tsx', import.meta.url), 'utf8');
  const sideboard = readFileSync(new URL('../src/components/HubSidebarDrawer.tsx', import.meta.url), 'utf8');

  assert.match(header, /Preiskatalog/);
  assert.match(footer, /Preiskatalog/);
  assert.doesNotMatch(header, /Preise & SaaS Tarife/);
  assert.doesNotMatch(sideboard, /Aufklappbare Sidebar|Sideliste aufklappen/);
  assert.match(sideboard, /role="tree"/);
  assert.match(sideboard, /role="treeitem"/);
  assert.match(breadcrumbs, /onClick=\{\(\) => onNavigate\(item\.path\)\}/);
  assert.match(breadcrumbs, /aria-current="page"/);
});

test('homepage hub directory shares the canonical catalog and excludes protected routes by default', () => {
  const home = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
  const directory = readFileSync(new URL('../src/components/HomeHubDirectory.tsx', import.meta.url), 'utf8');
  const learning = readFileSync(new URL('../src/features/learning/LearningPortalPage.tsx', import.meta.url), 'utf8');
  const studio = readFileSync(new URL('../src/features/studio/StudioPage.tsx', import.meta.url), 'utf8');
  assert.match(home, /HomeHubDirectory/);
  assert.match(directory, /MAIN_HUBS_CONFIG/);
  assert.match(directory, /hubId !== 'control-center' \|\| isOwner/);
  assert.match(directory, /session\?\.authenticated === true && session\?\.account\?\.iamRole === 'owner'/);
  assert.match(directory, /aria-expanded=\{isExpanded\}/);
  assert.match(directory, /onNavigate\(subpage\.path\)/);
  assert.doesNotMatch(learning, /SubpageSidebarNav/);
  assert.doesNotMatch(studio, /SubpageSidebarNav/);
});

test('documentation hub catalog links to the existing content instead of reopening the overview', () => {
  const catalog = readFileSync(new URL('../src/components/HubSidebarDrawer.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/components/HomeHubDirectory.tsx', import.meta.url), 'utf8');
  for (const route of ['/documentation/byok.html', '/documentation/pipeline-architectures.html', '/documentation/pricing-models.html', '/documentation/domains.html']) {
    assert.ok(catalog.includes("path: '" + route + "'"));
  }
  assert.match(home, /window\.location\.assign\(subpage\.path\)/);
  assert.match(catalog, /window\.location\.assign\(subpage\.path\)/);
  assert.ok(catalog.includes("badge: '13 Bereiche'"));
});
