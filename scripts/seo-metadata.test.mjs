import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isSeoPublicImage } from '../shared/seo-indexing-policy.mjs';

import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import { BLOG_ARTICLES } from '../shared/blog-articles.mjs';
import { auditPublicEditorialArticle } from '../shared/editorial-quality.mjs';
import { publicVideoSchema, publicLearningVideoSchemas, admittedPublicLearningVideos, EXPECTED_YOUTUBE_CHANNEL_ID } from '../shared/seo-video.mjs';
import {
  SEO_SITE_ORIGIN,
  SEO_SOCIAL_IMAGE,
  seoJsonLdForPath,
  seoMetadataForPath,
} from '../shared/seo-metadata.mjs';

test('Search logo is an admitted square image and static and dynamic publisher schemas agree', async () => {
  const readSourceOrDist = async (sourcePath, distPath) => {
    try { return await readFile(new URL(sourcePath, import.meta.url)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return readFile(new URL(distPath, import.meta.url));
    }
  };
  const html = (await readSourceOrDist('../index.html', '../dist/index.html')).toString();
  const staticSchema = JSON.parse(html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const publisher = seoJsonLdForPath('/')['@graph'].find(item => item['@id'].endsWith('#project'));
  assert.deepEqual(publisher['@type'], ['Organization', 'Project']);
  assert.deepEqual(staticSchema['@graph'].find(item => item['@id'] === publisher['@id']), publisher);
  const imagePath = new URL(publisher.logo.url).pathname;
  assert.equal(isSeoPublicImage(imagePath), true);
  const image = await readSourceOrDist('../public' + imagePath, '../dist' + imagePath);
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), publisher.logo.width);
  assert.equal(image.readUInt32BE(20), publisher.logo.height);
  assert.ok(publisher.logo.width >= 112);
  assert.equal(publisher.logo.width, publisher.logo.height);
  assert.doesNotMatch(html, /rel="icon" type="image\/svg\+xml"/);
  assert.match(html, /rel="icon" type="image\/png" sizes="96x96"/);
});

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
    assert.equal(schema['@graph'].length, 3 + (entry.path === '/learning' ? publicLearningVideoSchemas().length : 0));
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
  for (const route of ['/login', '/profile', '/control-center', '/tokenomics', '/not-inventory', '/vocabulary/capital-eventmesh']) {
    assert.equal(seoMetadataForPath(route), null, route);
    assert.equal(seoJsonLdForPath(route), null, route);
  }
});

test('learning schema describes a public collection, while the glossary remains a term set', () => {
  const learning = seoJsonLdForPath('/learning')['@graph'].find(item => item['@id'].endsWith('#primary'));
  assert.equal(learning['@type'], 'CollectionPage');
  assert.equal(learning.hasPart['@id'], 'https://capital-ai.online/learning#learning-methodology');
  assert.equal(learning.numberOfItems, undefined);
  assert.equal(seoJsonLdForPath('/vocabulary')['@graph'].at(-1)['@type'], 'DefinedTermSet');
  for (const route of ['/pricing', '/marketscreener/dokumentation']) assert.equal(seoMetadataForPath(route), null);
});

test('public license deep links agree with the canonical license metadata', async () => {
  const { licenseMetadata } = await import('../shared/license-metadata.mjs');
  for (const [path, license] of Object.entries(licenseMetadata)) {
    const seo = seoMetadataForPath(path);
    assert.ok(seo, path);
    assert.equal(seo.title, license.title, path);
    assert.equal(seo.description, license.description, path);
    assert.equal(seo.canonical, `https://capital-ai.online${path}`, path);
    assert.doesNotMatch(JSON.stringify(seo.jsonLd), /FinTech-Forschung|Forschungsprojekt/);
  }
});

test('public editorial source requires structural provenance, references and accessible illustration', () => {
  for (const article of BLOG_ARTICLES) assert.deepEqual(auditPublicEditorialArticle(article), [], article.path);
  const original = BLOG_ARTICLES[0];
  assert.ok(auditPublicEditorialArticle({ ...original, sources: [{ label: 'Private', url: 'http://example.com' }] }).includes('SOURCE_LINKS'));
  assert.ok(auditPublicEditorialArticle({ ...original, publishReady: false }).includes('NOT_PUBLICLY_APPROVED'));
  assert.ok(auditPublicEditorialArticle({ ...original, imageAlt: ' ' }).includes('ILLUSTRATION_AND_ALTERNATIVE_TEXT'));
  assert.ok(auditPublicEditorialArticle({ ...original, date: '2026-02-30' }).includes('PUBLICATION_DATE'));
});

test('unapproved learning videos never gain public VideoObject or imply paid video entitlement', () => {
  assert.deepEqual(publicLearningVideoSchemas(), []);
  assert.equal(seoJsonLdForPath('/learning')['@graph'].length, 3);
  const approved = {
    id: 'fixture-preview', category: 'Architektur',
    publicationState: 'PUBLISHED', visibility: 'PUBLIC', licenseState: 'VERIFIED',
    editorialApproval: 'APPROVED', searchEligible: true, isFreePreview: true,
    youtubeId: 'abcdefghijk', externalYouTubeId: 'abcdefghijk',
    providerChannelId: EXPECTED_YOUTUBE_CHANNEL_ID,
    providerReadbackVerified: true, processingStatus: 'SUCCEEDED', embeddable: true,
    assetSha256: 'a'.repeat(64), providerEvidenceRef: 'evidence://mock-provider-readback',
    title: 'CAPITAL AI Architektur erklaert',
    description: 'Ein öffentlich freigegebener Lernfilm über die Grundlagen von Systemarchitektur.',
    thumbnailUrl: 'https://capital-ai.online/learning/editorial/thumbnail.jpg',
    uploadDate: '2026-10-11T10:00:00+02:00', rightsEvidenceRef: 'evidence://mock-licensed-asset',
  };
  const schema = publicVideoSchema(approved);
  assert.equal(schema['@type'], 'VideoObject');
  assert.equal(schema.embedUrl, 'https://www.youtube-nocookie.com/embed/abcdefghijk');
  assert.equal(schema.isAccessibleForFree, true);
  assert.equal(schema.interactionStatistic, undefined);
  assert.equal(publicVideoSchema({ ...approved, licenseState: 'NOT_PROVEN' }), null);
  assert.equal(publicVideoSchema({ ...approved, visibility: 'ENTITLED_ONLY' }), null);
  assert.equal(publicVideoSchema({ ...approved, publicationState: 'DRAFT' }), null);
  assert.equal(publicVideoSchema({ ...approved, thumbnailUrl: 'http://example.com/preview.png' }), null);
  assert.equal(publicLearningVideoSchemas([approved, approved]).length, 1);
  assert.equal(admittedPublicLearningVideos([approved, approved]).length, 1);
  for (const invalid of [
    { publicationState: 'NOT_PUBLISHED' },
    { licenseState: 'REVIEW_REQUIRED' },
    { editorialApproval: 'REVIEW_REQUIRED' },
    { externalYouTubeId: null }, { providerChannelId: 'UCwrong' },
    { providerReadbackVerified: false }, { processingStatus: 'PROCESSING' },
    { embeddable: false }, { assetSha256: '' }, { providerEvidenceRef: '' },
    { isFreePreview: false }, { searchEligible: false },
  ]) {
    assert.equal(publicVideoSchema({ ...approved, ...invalid }), null, JSON.stringify(invalid));
    assert.deepEqual(publicLearningVideoSchemas([{ ...approved, ...invalid }]), [], JSON.stringify(invalid));
  }
  assert.equal(publicLearningVideoSchemas([
    approved, { ...approved, id: 'another-preview', youtubeId:'abcdefghijz',
      externalYouTubeId:'abcdefghijz' },
  ]).length, 1, 'one public/free preview per category');
  assert.equal(publicLearningVideoSchemas([
    approved, { ...approved, id: 'second-category', category:'Fintech Deepdive',
      youtubeId:'abcdefghijz', externalYouTubeId:'abcdefghijz' },
  ]).length, 2);

});
