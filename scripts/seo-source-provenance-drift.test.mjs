import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { SEO_CONTENT_MANIFEST } from '../shared/seo-content-manifest.mjs';
import {
  SEO_SOURCE_ARTIFACTS,
  seoSourceSetKey,
} from '../shared/seo-source-provenance.mjs';

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
