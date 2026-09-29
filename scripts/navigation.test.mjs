import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_NAVIGATION_EVENT, navigateAppLocation, readHubTab, resolveNavigationTarget } from '../src/utils/appNavigation.ts';

test('all 16 header tab links retain their hub and tab', () => {
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  const links = [...header.matchAll(/onNavigate\?\.\('([^']+\?tab=[^']+)'\)/g)].map(match => match[1]);
  assert.equal(links.length, 16);
  for (const link of links) assert.equal(resolveNavigationTarget(link), link);
});

test('aliases and trailing slash normalize without losing query or hash', () => {
  assert.equal(resolveNavigationTarget('/STUDIO-HUB/?tab=builder&ref=menu#details'), '/studio?tab=builder&ref=menu#details');
  assert.equal(resolveNavigationTarget('/lernportal?tab=quiz'), '/learning?tab=quiz');
  assert.equal(resolveNavigationTarget('/roadmap?tab=console'), '/control-center?tab=console');
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
