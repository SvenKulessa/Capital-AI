import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEditorialStatusGraphic } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

const input = {
  format: 'landscape', eyebrow: 'TEST ARTICLE', title: 'A factual status graphic', subtitle: 'Three reviewed states',
  note: 'Synthetic test data', sourceLabel: 'Synthetic source', altText: 'Three synthetic states.',
  rows: [
    { title: 'Design', lines: ['Available'] },
    { title: 'Pilot', lines: ['Planned', 'Conditions apply'] },
    { title: 'Delivery', lines: ['Not evidenced'] },
  ],
};

test('offline renderer produces deterministic, dimensioned PNGs with accessible vector source', async () => {
  for (const [format, width, height] of [['landscape', 1440, 960], ['portrait', 1080, 1350]]) {
    const first = await renderEditorialStatusGraphic({ ...input, format });
    const second = await renderEditorialStatusGraphic({ ...input, format });
    assert.deepEqual(first.png, second.png);
    assert.equal(first.png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(first.png.readUInt32BE(16), width);
    assert.equal(first.png.readUInt32BE(20), height);
    assert.match(first.svg, /aria-labelledby="title description"/);
    assert.match(first.svg, /LicenseRef-CapitalAI-Owned/);
    assert.doesNotMatch(first.svg, /AKASH|<image|<script|<foreignObject|href=/);
  }
});

test('source strings cannot insert executable markup or external images', async () => {
  const result = await renderEditorialStatusGraphic({ ...input, title: '<script>alert("x")</script>' });
  assert.match(result.svg, /&lt;script&gt;/);
  assert.doesNotMatch(result.svg, /<script/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [] }), /INPUT_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [{ title: 'Bad', lines: null }, ...input.rows.slice(1)] }), /ROWS_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, format: 'remote-svg' }), /INPUT_INVALID/);
});

 
// Independent, offline source/asset evidence checks. No remote requests or admissions.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const readRepo = path => readFileSync(new URL('../../' + path, import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const evidencePath = 'docs/growth/drafts/akash-20261121/source-review-v1.json';
const draftEvidence = JSON.parse(readRepo(evidencePath));
const akashManifest = JSON.parse(readRepo('docs/growth/drafts/akash-20261120/manifest.json'));

function validateAkashDraft(evidence, manifest) {
  assert.equal(evidence.contractVersion, 'CAPITAL_AI_AKASH_SOURCE_REVIEW@1');
  assert.equal(evidence.status, 'DRAFT_ONLY');
  assert.equal(evidence.source.historicalRawSourceAvailable, false);
  assert.equal(evidence.source.historicalSourceDigestRecomputed, false);
  assert.equal(evidence.source.currentRawSourceSha256, null);
  assert.equal(evidence.source.historicalByteComparison, 'NOT_PROVEN');
  assert.equal(evidence.source.comparisonScope, 'FACTUAL_SEMANTICS_ONLY_NOT_BYTE_IDENTITY');
  assert.equal(evidence.rights.sourceArticleCommercialGrant, 'NOT_PROVEN');
  assert.equal(evidence.rights.copyingSourceArticleOrExternalGraphics, 'BLOCKED');
  assert.equal(evidence.rights.editorialReview, 'REVIEW_REQUIRED');
  assert.equal(evidence.rights.publicPublishAllowed, false);
  assert.equal(evidence.quality.publicationDisposition, 'BLOCKED');
  assert.equal(digest(evidence.source.observedFactsGerman), evidence.source.observedFactsSha256);
  assert.equal(manifest.sourceUrl, evidence.source.url);
  assert.equal(manifest.sourceDigest, evidence.source.historicalSourceDigest);
  assert.equal(manifest.reviewedStoryDigest, evidence.firstParty.reviewedStoryDigest);
  assert.equal(manifest.sourceSha, evidence.firstParty.graphicSourceCommitSha);
  assert.equal(manifest.contentDigest, evidence.firstParty.expectedContentDigest);
  assert.equal(digest(JSON.stringify({
    contentId: manifest.assets[0].contentId,
    reviewedStoryDigest: manifest.reviewedStoryDigest,
    sourceUrl: manifest.sourceUrl,
    sourceDigest: manifest.sourceDigest,
    recipe: evidence.firstParty.recipe,
  })), manifest.contentDigest);
  assert.equal(manifest.sourceRights, 'NOT_PROVEN');
  assert.equal(manifest.editorialReview, 'REVIEW_REQUIRED');
  assert.equal(manifest.publicPublishAllowed, false);
  assert.equal(manifest.plan.publication.publicPublishAllowed, false);
  assert.equal(manifest.assets.length, 2);
  assert.equal(manifest.graphicOwnerGrants.length, manifest.assets.length);
  assert.equal(digest(readRepo(evidence.firstParty.graphicLicenseRef)), manifest.licenseDocumentSha256);
  for (const asset of manifest.assets) {
    assert.equal(asset.sourceDigest, manifest.sourceDigest);
    assert.equal(asset.contentDigest, manifest.contentDigest);
    assert.equal(asset.thirdPartyAssets, false);
    assert.equal(digest(readRepo(evidence.firstParty.graphicsPath + '/' + asset.assetId + '.png')), asset.sha256);
    const grant = manifest.graphicOwnerGrants.find(item => item.asset.assetId === asset.assetId);
    assert.ok(grant && grant.decision === 'LICENSED');
    assert.equal(grant.asset.sha256, asset.sha256);
    assert.equal(grant.authorizationEvidenceRef, evidence.firstParty.graphicLicenseRef);
    assert.ok(grant.allowedChannels.includes('WEBSITE'));
  }
  return true;
}

test('Akash source provenance remains draft-only; recompute own content and PNG digests', () => {
  assert.equal(validateAkashDraft(draftEvidence, akashManifest), true);
  const preview = readRepo(draftEvidence.firstParty.previewPath).toString('utf8');
  const renderer = readRepo(draftEvidence.firstParty.rendererPath).toString('utf8');
  assert.ok(preview.includes(akashManifest.sourceUrl));
  assert.ok(preview.includes('Redaktioneller Entwurf'));
  assert.ok(preview.includes('akash-portrait.png') && preview.includes('akash-landscape.png'));
  assert.ok(renderer.includes(akashManifest.sourceDigest));
  assert.ok(renderer.includes('publicPublishAllowed: false'));
});

test('Akash negative cases reject forged source identity, summary, grants and publication status', () => {
  const tamper = (changeEvidence, changeManifest) => {
    const evidence = structuredClone(draftEvidence);
    const manifest = structuredClone(akashManifest);
    changeEvidence?.(evidence);
    changeManifest?.(manifest);
    assert.throws(() => validateAkashDraft(evidence, manifest));
  };
  tamper(e => { e.status = 'READY'; });
  tamper(e => { e.rights.publicPublishAllowed = true; });
  tamper(e => { e.rights.sourceArticleCommercialGrant = 'APPROVED'; });
  tamper(e => { e.source.historicalByteComparison = 'VERIFIED'; });
  tamper(e => { e.source.observedFactsGerman += ' verändert'; });
  tamper(null, m => { m.sourceDigest = '0'.repeat(64); });
  tamper(null, m => { m.assets[0].sha256 = '0'.repeat(64); });
  tamper(null, m => { m.plan.publication.publicPublishAllowed = true; });
});
