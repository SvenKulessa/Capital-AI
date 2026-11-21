import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildGrowthImageDrafts, growthImagePreviewHtml, SOURCE_SHA256 } from './growth-intelligence-image-drafts.mjs';
import { ContentSocialPackageManifestSchema, withContentSocialApproval } from '../../src/contracts/contentSocialPackage.ts';
import { buildSocialPublisherHandoff, CURRENT_SOCIAL_PUBLISHER_ADAPTERS } from '../../src/contracts/socialPublisherAdapter.ts';

const sha = value => createHash('sha256').update(value).digest('hex');
let pending;
const bundle = () => pending ??= buildGrowthImageDrafts();

test('two offline image drafts remain source-bound, original, channel-isolated and DRAFT_ONLY', async () => {
  const b = await bundle();
  assert.equal(b.sourceDigest, SOURCE_SHA256);
  assert.equal(b.publicPublishAllowed, false);
  assert.equal(b.providerCalls, 0);
  assert.equal(b.campaignSpend, 0);
  assert.deepEqual(b.drafts.map(d => [d.contentId, d.channel, d.width, d.height]), [
    ['CAP-GROW-005', 'X', 1440, 960], ['CAP-GROW-007', 'INSTAGRAM', 1080, 1350],
  ]);
  const tokens = JSON.parse(readFileSync(new URL('../../public/branding/asset-pack/meta/social-render-tokens.json', import.meta.url), 'utf8'));
  for (const d of b.drafts) {
    assert.equal(d.png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(d.png.readUInt32BE(16), d.width);
    assert.equal(d.png.readUInt32BE(20), d.height);
    assert.equal(d.pngSha256, sha(d.png));
    assert.equal(d.svgSha256, sha(d.svg));
    assert.equal(d.originalGraphic.sha256, d.socialPackage.assets[1].sha256);
    assert.equal(d.originalGraphic.sourceSha, d.socialPackage.sourceSha);
    assert.equal(d.originalGraphic.origin, 'FIRST_PARTY_TEMPLATE');
    assert.equal(d.originalGraphic.thirdPartyAssets, false);
    assert.equal(d.contentPlan.graphicLicenses[0].state, 'REVIEW_REQUIRED');
    assert.equal(d.graphicRights.graphicUseAllowed, false);
    assert.equal(d.publicPublishAllowed, false);
    assert.deepEqual(d.contentPlan.campaign.channels, [d.channel]);
    assert(d.contentPlan.modules.some(m => m.module === 'IMAGE'));
    assert.deepEqual(d.socialPackage.approvals, []);
    assert.deepEqual(d.socialPackage.deliveries, []);
    assert.match(d.svg, /aria-labelledby="title description"/);
    assert.doesNotMatch(d.svg, /<script|<image\b|<foreignObject|href=/);
    for (const color of ['cyan','violet','gold','pink','rose','blue','green']) {
      assert(d.svg.includes('stop-color="' + tokens.color.universe[color].$value + '"'));
    }
  }
});

test('immutable PNGs and manifests reject tampering and forged publish approvals', async () => {
  const a = await bundle();
  const b = await buildGrowthImageDrafts();
  for (let i = 0; i < 2; i++) {
    const d = a.drafts[i];
    assert.equal(d.pngSha256, b.drafts[i].pngSha256);
    const mutated = structuredClone(d.socialPackage);
    mutated.assets[1].sha256 = '0'.repeat(64);
    assert.equal(ContentSocialPackageManifestSchema.safeParse(mutated).success, false);
    assert.throws(() => buildSocialPublisherHandoff(d.socialPackage, d.channel, d.originalGraphic.assetId),
      /CONTENT_SOCIAL_PUBLISHER_NOT_READY/);
    const fake = withContentSocialApproval(d.socialPackage, {
      approvalRef: 'synthetic-only', assetId: d.originalGraphic.assetId,
      assetSha256: d.pngSha256, approvedChannels: [d.channel],
      approvedAt: '2026-11-21T00:00:00.000Z', approvedBy: 'synthetic', publicPublishAllowed: true,
    });
    assert.throws(() => buildSocialPublisherHandoff(fake, d.channel, d.originalGraphic.assetId,
      { ...CURRENT_SOCIAL_PUBLISHER_ADAPTERS, [d.channel]: 'READY' }, []),
      /CONTENT_SOCIAL_PUBLISHER_APPROVAL_REQUIRED/);
  }
});

test('semantic 320/390-ready preview escapes hostile text, supports alt and reduced motion', async () => {
  const d = (await bundle()).drafts;
  const html = growthImagePreviewHtml(d);
  assert.match(html, /<html lang="de">/);
  assert.match(html, /width=device-width,initial-scale=1/);
  assert.equal((html.match(/<img /g) || []).length, 2);
  assert.equal((html.match(/<figure>/g) || []).length, 2);
  assert.equal((html.match(/alt="/g) || []).length, 2);
  assert.match(html, /minmax\(min\(100%,320px\),1fr\)/);
  assert.match(html, /max-width:100%/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /focus-visible/);
  assert.doesNotMatch(html, /<script|<iframe|https?:\/\//);
  assert.match(growthImagePreviewHtml([{ ...d[0], altText: '<script>bad</script>' }, d[1]]), /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.throws(() => growthImagePreviewHtml([d[0], { ...d[1], publicPublishAllowed: true }]), /GROWTH_IMAGE_PREVIEW_NOT_SAFE/);
});
