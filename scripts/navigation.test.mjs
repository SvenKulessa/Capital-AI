import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_NAVIGATION_EVENT, navigateAppLocation, readHubTab, resolveNavigationTarget, resolveAppRoute } from '../src/utils/appNavigation.ts';

test('all 16 sideboard tab links retain their hub and tab', () => {
  const sidebar = readFileSync(new URL('../src/components/HubSidebarDrawer.tsx', import.meta.url), 'utf8');
  const links = [...sidebar.matchAll(/path: '([^']+\?tab=[^']+)'/g)].map(match => match[1]);
  assert.equal(links.length, 16);
  assert.ok(links.includes('/control-center?tab=licenses'));
  for (const link of links) assert.equal(resolveNavigationTarget(link), link);
});

test('footer keeps license navigation on the public canonical license route', () => {
  const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');
  assert.match(footer, /href="\/lizenz"/);
  assert.doesNotMatch(footer, /href="\/control-center\?tab=licenses"/);
  assert.match(footer, /Lizenzen &amp; Nachweise/);
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

test('legal and research deep links retain their destination and query state', () => {
  for (const route of ['/lizenz', '/datenprovider-lizenzen', '/opensource-lizenzen', '/forschung', '/impressum', '/datenschutz', '/agb']) {
    assert.equal(resolveAppRoute(route), route);
    assert.equal(resolveNavigationTarget(route.toUpperCase() + '/?ref=footer#details'), route + '?ref=footer#details');
  }
  assert.equal(resolveNavigationTarget('/academic-terms?provider=binance'), '/datenprovider-lizenzen?provider=binance');
  assert.equal(resolveAppRoute('/oss'), '/opensource-lizenzen');
  assert.equal(resolveAppRoute('/research'), '/forschung');
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
