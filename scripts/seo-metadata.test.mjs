import test from 'node:test';
import assert from 'node:assert/strict';

import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import {
  SEO_SITE_ORIGIN,
  SEO_SOCIAL_IMAGE,
  seoJsonLdForPath,
  seoMetadataForPath,
} from '../shared/seo-metadata.mjs';

test('SEO-02 projects canonical metadata for every manifest entry', () => {
  for (const entry of SEO_CONTENT_MANIFEST) {
    const metadata = seoMetadataForPath(entry.path);
    assert.ok(metadata, entry.path);
    assert.equal(metadata.title, entry.title);
    assert.equal(metadata.description, entry.description);
    assert.equal(metadata.canonical, entry.canonical);
    assert.equal(metadata.robots, entry.robots);
    assert.equal(metadata.language, 'de');
    assert.equal(metadata.ogSiteName, 'Capital-AI');
    assert.equal(metadata.ogImage, SEO_SOCIAL_IMAGE);
    assert.equal(metadata.twitterCard, 'summary_large_image');
  }
});

test('SEO-02 emits one claimsafe schema graph without FinancialService or synthetic offers', () => {
  for (const entry of SEO_CONTENT_MANIFEST) {
    const schema = seoJsonLdForPath(entry.path);
    assert.equal(schema['@context'], 'https://schema.org');
    assert.equal(schema['@graph'].length, 3);
    const serialized = JSON.stringify(schema);
    assert.doesNotMatch(serialized, /FinancialService/);
    assert.doesNotMatch(serialized, /"offers"/);
    assert.match(serialized, new RegExp(SEO_SITE_ORIGIN.replaceAll('.', '\\.') ));
  }
});

test('SEO-02 preserves vocabulary semantics from the canonical vocabulary source', () => {
  const metadata = seoMetadataForPath('/vocabulary/orderbuch');
  const primary = metadata.jsonLd['@graph'].find(item => item['@id'].endsWith('#primary'));
  assert.equal(primary['@type'], 'DefinedTerm');
  assert.equal(primary.termCode, 'orderbuch');
  assert.ok(primary.alternateName.includes('Markttiefe'));
  assert.equal(primary.inDefinedTermSet, 'https://capital-ai.online/vocabulary');
});

test('SEO-02 returns no metadata for routes that are not admitted by SEO-01', () => {
  for (const route of ['/login', '/profile', '/control-center', '/tokenomics', '/not-inventory']) {
    assert.equal(seoMetadataForPath(route), null, route);
    assert.equal(seoJsonLdForPath(route), null, route);
  }
});
