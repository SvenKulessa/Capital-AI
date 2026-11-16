import test from 'node:test';
import assert from 'node:assert/strict';

import {
  importMediaKitV5Draft,
  MEDIAKIT_V5_ID,
  MEDIAKIT_V5_INTAKE_VERSION,
} from '../Editing/MediaKitV5Import';
import { validateMediaProjectV2 } from '../Contracts/MediaProjectValidation';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

function kit() {
  return {
    kitId: MEDIAKIT_V5_ID,
    manifestRef: 'docs/growth/mediakit-v5/manifest.json',
    manifestSha256: HASH_C,
    contentId: 'capital-ai-mediakit-v5',
    title: 'CAPITAL-AI Social Media MediaKit v5',
    slug: 'capital-ai-mediakit-v5',
    aspectRatio: '1:1',
    assets: [
      {
        assetId: 'poster-01', kind: 'IMAGE',
        reference: 'public/branding/asset-pack/poster-01.webp',
        sha256: HASH_A, mimeType: 'image/webp',
        provenance: {
          origin: 'OWNER_CREATED',
          sourceRef: 'internal-source/poster-01',
          evidenceRef: 'evidence/poster-01',
        },
        sourceRights: { status: 'VERIFIED', evidenceRef: 'rights/source-01' },
        mediaRights: { status: 'VERIFIED', evidenceRef: 'rights/media-01' },
        reviewStatus: 'APPROVED',
      },
      {
        assetId: 'video-01', kind: 'VIDEO',
        reference: 'media/mediakit-v5/video-01.mp4',
        sha256: HASH_B, mimeType: 'video/mp4',
        provenance: { origin: 'GENERATED', sourceRef: 'internal-source/video-01' },
        sourceRights: { status: 'NOT_PROVEN' },
        mediaRights: { status: 'BLOCKED', evidenceRef: 'rights/hold-01' },
        reviewStatus: 'REVIEW_REQUIRED',
      },
      {
        assetId: 'summary-pdf', kind: 'DOCUMENT',
        reference: 'docs/growth/mediakit-v5/summary.pdf',
        sha256: HASH_C, mimeType: 'application/pdf',
        provenance: { origin: 'OWNER_CREATED', sourceRef: 'internal-source/summary-pdf' },
        sourceRights: { status: 'NOT_PROVEN' },
        mediaRights: { status: 'NOT_PROVEN' },
        reviewStatus: 'REVIEW_REQUIRED',
      },
    ],
  };
}

test('MediaKit v5 maps into valid native MediaProject v2 without publisher authority', () => {
  const fixture = kit();
  const original = structuredClone(fixture);
  const output = importMediaKitV5Draft(fixture);
  assert.deepEqual(fixture, original);
  assert.equal(output.schema, MEDIAKIT_V5_INTAKE_VERSION);
  assert.equal(output.publicationState, 'DRAFT_ONLY');
  assert.equal(output.publicPublishAllowed, false);
  assert.equal(output.publicationApproval, false);
  assert.equal(output.reviewStatus, 'REVIEW_REQUIRED');
  assert.deepEqual(output.approvals, []);
  assert.deepEqual(output.deliveries, []);
  assert.deepEqual(validateMediaProjectV2(output.project), { ok: true, errors: [] });
  assert.equal(output.project.renderRecipe.publishReady, false);
  assert.equal(output.project.renderRecipe.networkPolicy, 'offline');
  assert.equal(output.project.source.sha256, HASH_C);
  assert.equal(output.project.contentPackageId, fixture.contentId);
  assert.deepEqual(output.project.assets.map((a) => a.id), ['poster-01', 'video-01']);
  assert.equal(output.project.tracks.find((x) => x.id === 'mediakit-v5-images')?.enabled, false);
  assert.equal(output.project.tracks.find((x) => x.id === 'mediakit-v5-images')?.layers[0]?.enabled, false);
  assert.equal(output.reviewAssets[2]?.route, 'REVIEW_ONLY');
  assert.equal(JSON.stringify(output).includes('approvalRef'), false);
});

test('a claimed verified license, provenance URL or reported approval never self-authorizes', () => {
  const out = importMediaKitV5Draft(kit());
  const poster = out.reviewAssets[0];
  assert.equal(poster?.sourceRights.declared, 'VERIFIED');
  assert.equal(poster?.sourceRights.assessed, 'NOT_PROVEN');
  assert.equal(poster?.mediaRights.assessed, 'NOT_PROVEN');
  assert.equal(poster?.identityStatus, 'NOT_PROVEN');
  assert.equal(poster?.reportedReviewStatus, 'APPROVED');
  assert.equal(poster?.reviewStatus, 'REVIEW_REQUIRED');
  assert.equal(out.reviewAssets[1]?.mediaRights.assessed, 'BLOCKED');
  assert.equal(out.project.assets[0]?.metadata?.verifiedBytes, false);
  assert.equal(out.project.metadata?.publicPublishAllowed, false);
});

test('rejects ambiguous paths, untrusted release fields and duplicate identities', () => {
  for (const reference of [
    '../secret.jpg', 'https://evil.example/asset.png', '/etc/passwd',
    'C:\\windows\\secret.png', 'public/%2e%2e/private.jpg', 'public/./asset.jpg',
  ]) {
    const fixture = kit();
    fixture.assets[0].reference = reference;
    assert.throws(() => importMediaKitV5Draft(fixture), /MEDIAKIT_V5_ASSET_REFERENCE_INVALID/);
  }
  const fixture = kit();
  fixture.assets[1].assetId = 'poster-01';
  assert.throws(() => importMediaKitV5Draft(fixture), /MEDIAKIT_V5_ASSET_ID_INVALID/);

  const releaseInjection = { ...kit(), publicPublishAllowed: true };
  assert.throws(() => importMediaKitV5Draft(releaseInjection), /MEDIAKIT_V5_MANIFEST_FIELDS_INVALID/);
  const approvalInjection = kit();
  Object.assign(approvalInjection.assets[0], { approvalRef: 'owner-override' });
  assert.throws(() => importMediaKitV5Draft(approvalInjection), /MEDIAKIT_V5_ASSET_FIELDS_INVALID/);
});

test('rejects missing identity, wrong media type, unknown rights and invalid kit version', () => {
  const badHash = kit();
  badHash.assets[0].sha256 = '';
  assert.throws(() => importMediaKitV5Draft(badHash), /MEDIAKIT_V5_ASSET_HASH_INVALID/);

  const badMime = kit();
  badMime.assets[0].mimeType = 'text/html';
  assert.throws(() => importMediaKitV5Draft(badMime), /MEDIAKIT_V5_KIND_MIME_MISMATCH/);

  const badRights = kit();
  badRights.assets[0].sourceRights.status = 'COMMERCIALLY_ALLOWED';
  assert.throws(() => importMediaKitV5Draft(badRights), /MEDIAKIT_V5_SOURCE_RIGHTS_INVALID/);

  const badVersion = { ...kit(), kitId: 'CAPITAL-AI-SOCIAL-MEDIA-MEDIAKIT-v4' };
  assert.throws(() => importMediaKitV5Draft(badVersion), /MEDIAKIT_V5_KIT_VERSION_INVALID/);

  const empty = { ...kit(), assets: [] };
  assert.throws(() => importMediaKitV5Draft(empty), /MEDIAKIT_V5_ASSET_COUNT_INVALID/);
});
