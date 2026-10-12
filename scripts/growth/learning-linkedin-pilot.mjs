// Run: node --import tsx scripts/growth/learning-linkedin-pilot.mjs [lesson-id]
// Emits DRAFT-only output; no connection, publish, OAuth or credentials required.
import { buildLearningContentCampaign } from '../../src/contracts/learningContentCampaign.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';
import { prepareLinkedInLearningCopy } from '../../server/content-engine/linkedin-copy.mjs';

const source = await buildLearningContentCampaign();
const copy = prepareLinkedInLearningCopy({
  plan: source.plan, socialPackage: source.socialPackage,
  drafts: source.drafts, draftId: process.argv[2] ?? 'gewichtung',
});
const socialPackage = buildDraftContentSocialPackage({
  campaign: source.plan.campaign, contentId: source.socialPackage.contentId,
  assets: [copy.asset],
});
console.log(JSON.stringify({
  contractVersion: source.plan.contractVersion,
  channel: copy.channel,
  text: copy.text,
  asset: copy.asset,
  socialPackage,
  publication: { state: 'DRAFT', approved: false, providerDeliveryId: null,
    readback: 'NOT_PROVEN', publicPublishAllowed: false },
}, null, 2));
