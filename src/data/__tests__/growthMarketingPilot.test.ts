import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ContentCampaignBriefSchema, planContentCampaign } from '../../contracts/contentEngine.ts';
import { GrowthMarketingChannelSchema } from '../../contracts/growthAiPromotion.ts';
import {
  FIRST_X_PILOT_SOURCE_SHA, FIRST_X_PILOT_CAMPAIGN,
  FIRST_X_PILOT_PACKAGE, FIRST_X_PILOT_PLAN,
  FIRST_X_PILOT_TEXT, FIRST_X_PILOT_TEXT_SHA256,
  FIRST_X_PILOT_STATE, GROWTH_SOCIAL_PROCESS_STAGES,
  GROWTH_X_TEST_BUDGET,
} from '../growthMarketingPilot.ts';

test('first educational X prototype passes existing Content Engine + Social Package contracts', () => {
  assert.equal(GrowthMarketingChannelSchema.parse('X'), 'X');
  const campaign = ContentCampaignBriefSchema.parse(FIRST_X_PILOT_CAMPAIGN);
  assert.ok(campaign.channels.includes('X'));
  assert.deepEqual(campaign.channels, ['WEBSITE', 'X']);
  const plan = planContentCampaign(campaign);
  assert.equal(plan.cadsQuality.technicalStatus, 'PASS');
  assert.equal(plan.publication.publicPublishAllowed, false);
  assert.equal(FIRST_X_PILOT_PLAN.publication.publicPublishAllowed, false);
  assert.equal(FIRST_X_PILOT_PACKAGE.sourceSha, FIRST_X_PILOT_SOURCE_SHA);
  assert.equal(FIRST_X_PILOT_PACKAGE.campaignId, FIRST_X_PILOT_CAMPAIGN.campaignId);
  assert.equal(FIRST_X_PILOT_PACKAGE.publicationAuthority, 'SOCIAL_MEDIA_ENGINE_ONLY');
  assert.deepEqual(FIRST_X_PILOT_PACKAGE.approvals, []);
  assert.deepEqual(FIRST_X_PILOT_PACKAGE.deliveries, []);
});

test('X text is immutable SHA-256-bound to the actual draft; unknown provider state is not promoted', () => {
  assert.ok(FIRST_X_PILOT_TEXT.length <= 280);
  const hash = createHash('sha256').update(FIRST_X_PILOT_TEXT, 'utf8').digest('hex');
  assert.equal(hash, FIRST_X_PILOT_TEXT_SHA256);
  assert.equal(FIRST_X_PILOT_PACKAGE.assets[0].sha256, hash);
  assert.equal(FIRST_X_PILOT_PACKAGE.assets[0].kind, 'TEXT');
  assert.match(FIRST_X_PILOT_PACKAGE.assets[0].evidenceRef, new RegExp(FIRST_X_PILOT_SOURCE_SHA));
  assert.equal(FIRST_X_PILOT_STATE.status, 'DRAFT');
  assert.equal(FIRST_X_PILOT_STATE.review, 'REVIEW_REQUIRED');
  assert.equal(FIRST_X_PILOT_STATE.published, 'NOT_PROVEN');
  assert.equal(FIRST_X_PILOT_STATE.providerCalls, 0);
  assert.equal(FIRST_X_PILOT_STATE.scheduled, false);
  assert.equal(FIRST_X_PILOT_STATE.publicPublishAllowed, false);
});

test('visible process graph stays ordered and does not invent scheduling or provider telemetry', () => {
  assert.deepEqual(GROWTH_SOCIAL_PROCESS_STAGES.map(stage => stage.id),
    ['source','draft','review','render','schedule','publish','measure']);
  for (const stage of GROWTH_SOCIAL_PROCESS_STAGES) {
    assert.ok(stage.titleDe && stage.titleEn && stage.detailDe && stage.detailEn);
    assert.ok(['REPO_IMPLEMENTED','REVIEW_REQUIRED','NOT_PROVEN'].includes(stage.status));
    assert.ok(!stage.evidencePath.startsWith('/'));
    assert.ok(!stage.evidencePath.includes('..'));
  }
  for (const stage of GROWTH_SOCIAL_PROCESS_STAGES.slice(4)) {
    assert.equal(stage.status, 'NOT_PROVEN');
  }
});

test('budget proportions sum to 100 with zero unattended activity and no spam automation', () => {
  assert.equal(GROWTH_X_TEST_BUDGET.ownerReportedCreditUsd, 20);
  assert.ok(GROWTH_X_TEST_BUDGET.proposedPilotAllocationUsd <= GROWTH_X_TEST_BUDGET.ownerReportedCreditUsd);
  assert.equal(Object.values(GROWTH_X_TEST_BUDGET.proposedPercentages).reduce((a,b) => a+b,0),100);
  assert.equal(GROWTH_X_TEST_BUDGET.maxUnattendedExternalSpendUsd,0);
  assert.equal(GROWTH_X_TEST_BUDGET.automaticFollowsAllowed,false);
  assert.equal(GROWTH_X_TEST_BUDGET.unsolicitedRepliesAllowed,false);
  assert.equal(GROWTH_X_TEST_BUDGET.unsolicitedMarketingEmailAllowed,false);
  assert.equal(GROWTH_X_TEST_BUDGET.liveBalanceVerified,false);
});

test('public home visualizes the real pilot workflow without making provider success claims', () => {
  const ui = readFileSync(new URL('../../features/home/SocialContentEngineStatus.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../../features/home/ContentEngineConcept.tsx', import.meta.url), 'utf8');
  assert.match(home, /<SocialContentEngineStatus\s*\/>/);
  assert.match(ui, /GROWTH_SOCIAL_PROCESS_STAGES\.map/);
  assert.match(ui, /aria-labelledby="social-content-engine-status"/);
  assert.match(ui, /sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(ui, /FIRST_X_PILOT_STATE\.published/);
  assert.match(ui, /GROWTH_X_TEST_BUDGET\.ownerReportedCreditUsd/);
  assert.doesNotMatch(ui, /\/api\/social-media\/x\/article-test\/publish/);
  assert.doesNotMatch(ui, /fetch\(/);
});
