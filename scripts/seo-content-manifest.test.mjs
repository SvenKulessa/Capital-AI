import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { vocabularyMetadata } from '../shared/vocabulary-metadata.mjs';
import { QUANT_PRO_IDS } from '../shared/vocabulary-access-policy.mjs';
import { seoIndexableStaticPaths } from '../shared/seo-indexing-policy.mjs';
import {
  SEO_CONTENT_MANIFEST,
  SEO_CONTENT_SOURCE_SHA,
  SEO_CONTENT_BY_PATH,
  seoContentForPath,
  validateSeoContentManifest,
} from '../shared/seo-content-manifest.mjs';
import {
  SEO_PROVENANCE_GENERATED_AT_MAIN_SHA,
  SEO_SOURCE_ARTIFACTS,
  seoSourceSetKey,
} from '../shared/seo-source-provenance.mjs';

test('SEO-01 manifest covers every INDEX route exactly once', () => {
  const publicVocabulary = vocabularyMetadata.filter((entry) => !QUANT_PRO_IDS.has(entry.id));
  const expected = [...seoIndexableStaticPaths(), ...publicVocabulary.map((entry) => entry.path)].sort();
  const actual = SEO_CONTENT_MANIFEST.map((entry) => entry.path).sort();

  assert.deepEqual(actual, expected);
  assert.equal(SEO_CONTENT_MANIFEST.length, expected.length);
  assert.equal(SEO_CONTENT_BY_PATH.size, expected.length);
  assert.deepEqual(validateSeoContentManifest(), []);
});

test('SEO-01 provenance and eligibility are explicit for every manifest entry', () => {
  assert.match(SEO_CONTENT_SOURCE_SHA, /^[0-9a-f]{40}$/);
  assert.equal(SEO_CONTENT_SOURCE_SHA, SEO_PROVENANCE_GENERATED_AT_MAIN_SHA);
  for (const entry of SEO_CONTENT_MANIFEST) {
    assert.equal(entry.sourceSha, SEO_CONTENT_SOURCE_SHA);
    assert.match(entry.sourceBlobSha, /^[0-9a-f]{40}$/);
    assert.match(entry.contentDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(entry.generatedAtMainSha, /^[0-9a-f]{40}$/);
    assert.equal(entry.indexingState, 'INDEX');
    assert.equal(Object.keys(entry.sourceBlobShas).length, entry.sourceRefs.length);
    assert.equal(entry.searchEligible, true);
    assert.equal(typeof entry.socialEligible, 'boolean');
    assert.equal(typeof entry.aiSearchEligible, 'boolean');
    assert.equal(entry.license, 'PROPRIETARY');
    assert.ok(entry.sourceRefs.length > 0);
    assert.ok(entry.canonical.startsWith('https://capital-ai.online/'));
    assert.notEqual(entry.structuredDataType, 'FinancialService');
  }
});

test('SEO-01 has unique slugs, canonicals and titles', () => {
  for (const key of ['slug', 'canonical', 'title']) {
    const values = SEO_CONTENT_MANIFEST.map((entry) => entry[key]);
    assert.equal(new Set(values).size, values.length, key);
  }
});

test('SEO-01 returns only admitted content paths', () => {
  assert.equal(seoContentForPath('/').slug, 'home');
  assert.equal(seoContentForPath('/vocabulary/orderbuch').structuredDataType, 'DefinedTerm');
  const ownerGatedEntry = vocabularyMetadata.find((entry) => QUANT_PRO_IDS.has(entry.id));
  assert.ok(ownerGatedEntry);
  assert.equal(seoContentForPath(ownerGatedEntry.path), null);
  assert.equal(seoContentForPath('/profile'), null);
  assert.equal(seoContentForPath('/tokenomics'), null);
  assert.equal(seoContentForPath('/not-inventory'), null);
});


test('SEO-01 source blob and SHA-256 provenance fails closed on source drift', async () => {
  for (const [sourcePath, expected] of Object.entries(SEO_SOURCE_ARTIFACTS)) {
    const bytes = await readFile(new URL(`../${sourcePath}`, import.meta.url));
    const gitBlobSha = createHash('sha1')
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest('hex');
    const contentSha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(gitBlobSha, expected.sourceBlobSha, `${sourcePath}: git blob SHA drift`);
    assert.equal(contentSha256, expected.contentSha256, `${sourcePath}: SHA-256 drift`);
  }

  for (const entry of SEO_CONTENT_MANIFEST) {
    const material = [...entry.sourceRefs]
      .sort()
      .map((sourcePath) => {
        const source = SEO_SOURCE_ARTIFACTS[sourcePath];
        assert.ok(source, `${entry.path}: unknown source ${sourcePath}`);
        return `${sourcePath}\n${source.sourceBlobSha}\n${source.contentSha256}`;
      })
      .join('\n--\n');
    const digest = createHash('sha256').update(material).digest('hex');
    assert.equal(entry.contentDigest, `sha256:${digest}`, `${entry.path}: source-set digest drift`);
    assert.equal(seoSourceSetKey(entry.sourceRefs), [...entry.sourceRefs].sort().join('|'));
  }
});
