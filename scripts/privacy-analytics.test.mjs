import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VOCABULARY_PUBLIC_COUNT } from '../shared/vocabulary-metadata.mjs';
import { initGoogleAnalytics, trackEvent, trackPageView, trackLoginClick, updatePageSEO } from '../src/utils/analytics.ts';

test('optional analytics stays off even with an ID or an existing tracker', () => {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  let calls = 0;
  const dataLayer = [];
  globalThis.window = { gtag() { calls++; }, dataLayer };
  globalThis.document = { createElement() { calls++; }, head: { appendChild() { calls++; } } };
  try {
    initGoogleAnalytics('G-TEST');
    trackEvent('privacy-request', { details: 'must not be recorded' });
    trackPageView('/datenschutz', 'Datenschutz');
    trackLoginClick();
    assert.equal(calls, 0);
    assert.deepEqual(dataLayer, []);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

function withSeoDocument(location, run) {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const elements = [];
  const createElement = (tag) => ({
    tag,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    remove() { const index = elements.indexOf(this); if (index >= 0) elements.splice(index, 1); },
  });
  const select = (selector) => {
    const match = /^(meta|link)\[(name|property|rel)="([^"]+)"\]$/.exec(selector);
    return elements.find(element => element.tag === match?.[1] && element.attributes[match[2]] === match[3]) ?? null;
  };
  for (const name of ['twitter:title', 'twitter:description']) {
    const element = createElement('meta');
    element.setAttribute('name', name);
    elements.push(element);
  }
  globalThis.window = { location };
  globalThis.document = {
    title: '',
    querySelector: select,
    getElementById: id => elements.find(element => element.attributes.id === id) ?? null,
    createElement,
    head: { appendChild(element) { elements.push(element); } },
  };
  try { run(select, elements); } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
}

test('SPA SEO keeps production canonical and social URL on a preview host without campaign parameters', () => {
  withSeoDocument({ origin: 'https://preview.example', pathname: '/learning' }, (select, elements) => {
    updatePageSEO({ title: 'Learning', description: 'Learn', canonicalPath: '/learning?utm_source=ads#guide' });
    assert.equal(select('link[rel="canonical"]').attributes.href, 'https://capital-ai.online/learning');
    assert.equal(select('meta[property="og:url"]').attributes.content, 'https://capital-ai.online/learning');
    updatePageSEO({ title: 'FAQ', description: 'Help', canonicalPath: '/faq' });
    assert.equal(select('link[rel="canonical"]').attributes.href, 'https://capital-ai.online/faq');
    assert.equal(select('meta[property="og:url"]').attributes.content, 'https://capital-ai.online/faq');
    assert.equal(select('meta[name="twitter:title"]').attributes.content, 'FAQ');
    assert.equal(select('meta[name="twitter:description"]').attributes.content, 'Help');
    assert.equal(elements.filter(element => element.attributes.rel === 'canonical').length, 1);
    assert.equal(elements.filter(element => element.attributes.property === 'og:url').length, 1);
  });
});

test('SPA SEO defaults to the current path and never adopts an external canonical origin', () => {
  withSeoDocument({ origin: 'http://localhost:3000', pathname: '/faq' }, (select) => {
    updatePageSEO({ title: 'FAQ', description: 'Help' });
    assert.equal(select('link[rel="canonical"]').attributes.href, 'https://capital-ai.online/faq');
    updatePageSEO({ title: 'Learning', description: 'Learn', canonicalPath: 'https://other.example/learning?campaign=x#test' });
    assert.equal(select('link[rel="canonical"]').attributes.href, 'https://capital-ai.online/learning');
  });
});

test('SEO updates can be invoked outside a browser without evaluating window defaults', () => {
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  delete globalThis.window;
  delete globalThis.document;
  try {
    assert.doesNotThrow(() => updatePageSEO({ title: 'FAQ', description: 'Help' }));
  } finally {
    if (previousWindow !== undefined) globalThis.window = previousWindow;
    if (previousDocument !== undefined) globalThis.document = previousDocument;
  }
});

test('SPA navigation removes canonical, Open Graph URL and schema on NOINDEX/PRIVATE routes', () => {
  withSeoDocument({ origin: 'https://preview.example', pathname: '/learning' }, (select, elements) => {
    updatePageSEO({ title: 'Learning', description: 'Learn', canonicalPath: '/learning' });
    const schema = globalThis.document.createElement('script');
    schema.setAttribute('id', 'capital-ai-seo-jsonld');
    elements.push(schema);

    updatePageSEO({ title: 'Login', description: 'Account', canonicalPath: '/login?next=/learning' });
    assert.equal(select('meta[name="robots"]').attributes.content, 'noindex, nofollow');
    assert.equal(select('link[rel="canonical"]'), null);
    assert.equal(select('meta[property="og:url"]'), null);
    assert.equal(globalThis.document.getElementById('capital-ai-seo-jsonld'), null);

    updatePageSEO({ title: 'Private', description: 'Private', canonicalPath: '/profile/key-vault' });
    assert.equal(select('meta[name="robots"]').attributes.content, 'noindex, nofollow');
    assert.equal(select('link[rel="canonical"]'), null);

    updatePageSEO({ title: 'Learning', description: 'Learn', canonicalPath: '/learning' });
    assert.equal(select('meta[name="robots"]').attributes.content, 'index, follow, max-snippet:-1, max-image-preview:large');
    assert.equal(select('link[rel="canonical"]').attributes.href, 'https://capital-ai.online/learning');
    assert.equal(select('meta[property="og:url"]').attributes.content, 'https://capital-ai.online/learning');
  });
});

test('SPA vocabulary messaging references the public, not restricted, catalog count', () => {
  const source = readFileSync(new URL('../src/platform/analytics/useRouteAnalytics.ts', import.meta.url), 'utf8');
  assert.match(source, /const VOCABULARY_PUBLIC_COUNT = __VOCABULARY_PUBLIC_COUNT__;/);
  const build = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.match(build, /import \{ VOCABULARY_PUBLIC_COUNT \} from '.\/shared\/vocabulary-metadata.mjs'/);
  assert.match(build, /__VOCABULARY_PUBLIC_COUNT__: JSON.stringify\(VOCABULARY_PUBLIC_COUNT\)/);
  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/\.\.\/shared\/vocabulary-metadata\.mjs['"]/, 'avoid full vocabulary corpus in SPA entry');
  assert.doesNotMatch(source, /294 Fachbegriffe|294 konsolidierte/);
});
