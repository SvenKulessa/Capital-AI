import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareLinkedInLearningCopy } from './linkedin-copy.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const sourceSha = 'a'.repeat(64);
const text = 'Gewichteter Score\nGewichte prüfen\n0,50 × 0,80 = 0,40\nAlle Zahlen sind synthetisch; keine Prognose oder Anlageberatung.\nKostenlos weiterlesen: https://capital-ai.online/learning#gewichtung';
function fixture() {
  return {
    draftId: 'gewichtung',
    plan: { contractVersion: 'CAPITAL_AI_CONTENT_ENGINE@1',
      campaign: { campaignId: 'learning-test', sourceSha,
        canonicalUrl: 'https://capital-ai.online/learning', channels: ['WEBSITE', 'LINKEDIN'] },
      modules: [{ module: 'COPY', state: 'READY_FOR_DRAFT' }],
      publication: { publicPublishAllowed: false } },
    socialPackage: { contractVersion: 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
      publicationAuthority: 'SOCIAL_MEDIA_ENGINE_ONLY', campaignId: 'learning-test',
      contentId: 'learning', sourceSha, canonicalUrl: 'https://capital-ai.online/learning',
      approvals: [], deliveries: [], assets: [{ assetId: 'learning-gewichtung-text', kind: 'TEXT',
        sourceSha, sha256: sha(text), evidenceRef: 'owned-content:shared/learning-journey.mjs#gewichtung' }] },
    drafts: [{ id: 'gewichtung', text, canonicalUrl: 'https://capital-ai.online/learning',
      state: 'DRAFT', review: 'REVIEW_REQUIRED' }],
  };
}

test('emits a deterministic hash-bound first-party LinkedIn DRAFT without provider authority', () => {
  const result = prepareLinkedInLearningCopy(fixture());
  assert.equal(result.state, 'DRAFT');
  assert.equal(result.publicPublishAllowed, false);
  assert.equal(result.asset.sha256, sha(result.text));
  assert.equal(result.sourceAssetSha256, sha(text));
  assert.equal(result.asset.sourceSha256, undefined);
  assert.match(result.text, /keine Prognose oder Anlageberatung/);
  assert.deepEqual(prepareLinkedInLearningCopy(fixture()), result);
});

test('refuses altered sources, unknown channel and mismatched campaign', () => {
  const x = fixture();
  x.drafts[0].text += '\nnot validated';
  assert.throws(() => prepareLinkedInLearningCopy(x), /SOURCE_HASH_MISMATCH/);
  const y = fixture();
  y.plan.campaign.channels = ['WEBSITE'];
  assert.throws(() => prepareLinkedInLearningCopy(y), /PLAN_NOT_ADMITTED/);
  const z = fixture();
  z.socialPackage.sourceSha = 'b'.repeat(64);
  assert.throws(() => prepareLinkedInLearningCopy(z), /SOURCE_PACKAGE_MISMATCH/);
});

test('refuses fabricated approvals, unreviewed drafts and oversized copy', () => {
  const x = fixture();
  x.socialPackage.approvals = [{ forged: true }];
  assert.throws(() => prepareLinkedInLearningCopy(x), /SOURCE_PACKAGE_MISMATCH/);
  const y = fixture();
  y.drafts[0].review = 'APPROVED';
  assert.throws(() => prepareLinkedInLearningCopy(y), /EDITORIAL_SOURCE_INVALID/);
  const z = fixture();
  z.drafts[0].text = z.drafts[0].text + ' abc'.repeat(900);
  z.socialPackage.assets[0].sha256 = sha(z.drafts[0].text);
  assert.throws(() => prepareLinkedInLearningCopy(z), /TOO_LONG/);
});
