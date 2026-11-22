import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORIGINAL_GRAPHIC_LICENSE_ID, ORIGINAL_GRAPHIC_LICENSE_VERSION,
  OriginalGraphicLicensePlanSchema, planOriginalGraphicLicense,
  type OriginalGraphicAsset, type OriginalGraphicOwnerGrant,
} from '../originalGraphicLicense.ts';

const asset: OriginalGraphicAsset = {
  assetId: 'akash-compute-graphic-v1',
  contentId: 'akash-compute-forwards-design',
  sha256: 'a'.repeat(64),
  mimeType: 'image/png',
  sourceSha: 'b'.repeat(40),
  sourceDigest: 'c'.repeat(64),
  contentDigest: 'd'.repeat(64),
  origin: 'FIRST_PARTY_TEMPLATE',
  creationMethod: 'AI_ASSISTED',
  renderer: { id: 'capital-ai-editorial-graphic', version: '1' },
  thirdPartyAssets: false,
};

// Test-only trusted receipt. Production candidates cannot manufacture this authority.
const grant: OriginalGraphicOwnerGrant = {
  contractVersion: ORIGINAL_GRAPHIC_LICENSE_VERSION,
  grantId: 'synthetic-owner-graphic-grant',
  grantedBy: 'OWNER',
  ownerName: 'Synthetic test owner',
  authorizationEvidenceRef: 'test-fixture:explicit-owner-graphic-license',
  authorizedAt: '2026-11-20T12:00:00Z',
  decision: 'LICENSED',
  licenseId: ORIGINAL_GRAPHIC_LICENSE_ID,
  asset,
  allowedChannels: ['WEBSITE', 'INSTAGRAM'],
  aiAssistanceDisclosed: true,
};

test('a separately supplied matching grant licenses the graphic for its exact channel', () => {
  const plan = planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, grant);
  assert.equal(plan.state, 'LICENSED_FOR_CHANNEL');
  assert.equal(plan.graphicUseAllowed, true);
  assert.equal(plan.licenseId, 'LicenseRef-CapitalAI-Owned');
  assert.equal(plan.grantRef, grant.grantId);
  assert.equal(plan.publicationAllowed, false);
  assert.equal(plan.sourceRights, 'NOT_PROVEN');
  assert.equal(plan.editorialReview, 'REVIEW_REQUIRED');
  assert.deepEqual(OriginalGraphicLicensePlanSchema.parse(plan), plan);
});

test('missing grants and candidate-contained approvals cannot license the graphic', () => {
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }).graphicUseAllowed, false);
  assert.throws(() => planOriginalGraphicLicense({
    asset: { ...asset, grant } as OriginalGraphicAsset,
    channel: 'WEBSITE',
  }), /unrecognized/i);
  const forged = { ...grant, grantedBy: 'MODEL' } as unknown as OriginalGraphicOwnerGrant;
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, forged).reason, 'OWNER_GRANT_INVALID');
  const missingEvidence = { ...grant, authorizationEvidenceRef: '' };
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, missingEvidence).reason, 'OWNER_GRANT_INVALID');
});

test('modified asset bytes, MIME, content, source or renderer invalidate the old license binding', () => {
  const variants: OriginalGraphicAsset[] = [
    { ...asset, sha256: 'e'.repeat(64) },
    { ...asset, mimeType: 'image/webp' },
    { ...asset, assetId: 'different-asset' },
    { ...asset, contentId: 'different-content' },
    { ...asset, sourceSha: 'e'.repeat(40) },
    { ...asset, sourceDigest: 'e'.repeat(64) },
    { ...asset, contentDigest: 'e'.repeat(64) },
    { ...asset, renderer: { ...asset.renderer, version: '2' } },
    { ...asset, creationMethod: 'HUMAN_AUTHORED' },
  ];
  for (const modified of variants) {
    const plan = planOriginalGraphicLicense({ asset: modified, channel: 'WEBSITE' }, grant);
    assert.equal(plan.reason, 'ASSET_BINDING_MISMATCH');
    assert.equal(plan.graphicUseAllowed, false);
  }
});

test('third-party assets and mixed assets cannot use the own-graphic license', () => {
  for (const original of [
    { ...asset, origin: 'THIRD_PARTY_ASSET' as const },
    { ...asset, origin: 'MIXED_ASSET' as const },
    { ...asset, thirdPartyAssets: true },
  ]) {
    const plan = planOriginalGraphicLicense({ asset: original, channel: 'WEBSITE' }, { ...grant, asset: original });
    assert.equal(plan.state, 'BLOCKED');
    assert.equal(plan.reason, 'THIRD_PARTY_RIGHTS_REQUIRED');
  }
});

test('license channels, revocation and disclosed AI assistance are enforced separately', () => {
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'X' }, grant).reason, 'CHANNEL_NOT_LICENSED');
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, { ...grant, decision: 'REVOKED' }).reason,
    'OWNER_GRANT_REVOKED');
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, { ...grant, aiAssistanceDisclosed: false }).reason,
    'AI_DISCLOSURE_REQUIRED');
});

test('malformed identities and duplicate channels fail closed', () => {
  assert.throws(() => planOriginalGraphicLicense({ asset: { ...asset, sha256: 'not-a-hash' }, channel: 'WEBSITE' }));
  const duplicateChannels = { ...grant, allowedChannels: ['WEBSITE', 'WEBSITE'] as const };
  const plan = planOriginalGraphicLicense({ asset, channel: 'WEBSITE' }, duplicateChannels as unknown as OriginalGraphicOwnerGrant);
  assert.equal(plan.reason, 'OWNER_GRANT_INVALID');
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE', asOf: 'invalid-clock' }, grant).reason,
    'OWNER_GRANT_INVALID');
  assert.equal(planOriginalGraphicLicense({ asset, channel: 'WEBSITE', asOf: '2026-11-20T11:59:59Z' }, grant).reason,
    'OWNER_GRANT_INVALID');
});
