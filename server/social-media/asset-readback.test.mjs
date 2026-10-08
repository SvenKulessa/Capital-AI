import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { verifySocialStoredAsset } from './asset-readback.mjs';
const bytes = Buffer.from('PRIVATE_MEDIA_BYTES_FIXTURE');
const hash = createHash('sha256').update(bytes).digest('hex');
const sourceSha = 'b'.repeat(40);
const manifest = Object.freeze({
  contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
  publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY',
  campaignId: 'c', contentId: 'd', sourceSha,
  canonicalUrl: 'https://capital-ai.online/',
  assets: [{ assetId: 'a', contentId: 'd', sourceSha, sha256: hash }],
  approvals: [{ approvalRef: 'approval', assetId: 'a',
    assetSha256: hash, publicPublishAllowed: true, approvedChannels: ['YOUTUBE'] }],
});
const handoff = Object.freeze({
  contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1',
  campaignId: 'c', contentId: 'd', sourceSha,
  canonicalUrl: 'https://capital-ai.online/',
  assetId: 'a', assetSha256: hash, approvalRef: 'approval',
  channel: 'YOUTUBE', deliveryKey: 'c:d:a:YOUTUBE',
});
const row = { assetId: 'a', contentId: 'd', sourceSha, bytes };
const evidence = { assetId: 'a', contentId: 'd', sourceSha,
  assetSha256: hash, rightsVerified: true, evidenceRef: 'trusted://rights' };
test('actual private bytes and rights produce only redacted verification facts', async () => {
  const value = await verifySocialStoredAsset({
    manifest, handoff, loadImmutableBytes: async () => row,
    loadRightsEvidence: async () => evidence,
  });
  assert.equal(value.retrievedBytesSha256, hash);
  assert.equal(value.rightsVerified, true);
  assert.ok(!JSON.stringify(value).includes('PRIVATE_MEDIA_BYTES'));
  assert.ok(!Object.hasOwn(value, 'bytes'));
});
test('refuses bytes spoof, missing rights, remote-only references and oversized body', async () => {
  const base = { manifest, handoff, loadImmutableBytes: async () => row,
    loadRightsEvidence: async () => evidence };
  await assert.rejects(verifySocialStoredAsset({ ...base,
    loadImmutableBytes: async () => ({ ...row, bytes: Buffer.from('TAMPER') }),
  }), /SOCIAL_ASSET_BYTES_HASH_MISMATCH/);
  await assert.rejects(verifySocialStoredAsset({ ...base,
    loadRightsEvidence: async () => ({ ...evidence, rightsVerified: false }),
  }), /SOCIAL_ASSET_RIGHTS_UNVERIFIED/);
  await assert.rejects(verifySocialStoredAsset({ ...base,
    loadImmutableBytes: async () => ({ ...row, bytes: undefined,
      url: 'https://attacker.example/media' }),
  }), /SOCIAL_ASSET_IMMUTABLE_STORAGE_MISMATCH/);
  await assert.rejects(verifySocialStoredAsset({ ...base, maxBytes: 1 }),
    /SOCIAL_ASSET_IMMUTABLE_STORAGE_MISMATCH/);
});
test('unavailable private storage fails closed without leaking raw provider errors', async () => {
  await assert.rejects(verifySocialStoredAsset({ manifest, handoff,
    loadImmutableBytes: async () => { throw Error('Storage details with secret'); },
    loadRightsEvidence: async () => evidence,
  }), /SOCIAL_ASSET_STORAGE_UNAVAILABLE/);
});
