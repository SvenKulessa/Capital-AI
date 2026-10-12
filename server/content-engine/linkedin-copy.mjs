// CAPITAL_AI_CONTENT_ENGINE@1 / COPY: deterministic LinkedIn editorial adaptation.
// This file is deliberately offline and DRAFT-only. It never grants provider authority.
import { createHash } from 'node:crypto';

const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const digest = /^[a-f0-9]{64}$/;
const validId = /^[a-z0-9][a-z0-9-]{0,100}$/;
function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}

/**
 * Convert a verified, first-party Learning draft into a LinkedIn copy asset.
 * Returns a new asset hash for the exact copy bytes, never an approval or delivery.
 * Callers must persist/review these exact bytes before any Social Media Engine handoff.
 */
export function prepareLinkedInLearningCopy({ plan, socialPackage, drafts, draftId } = {}) {
  requireCondition(typeof draftId === 'string' && validId.test(draftId), 'LINKEDIN_COPY_ID_INVALID');
  requireCondition(plan?.contractVersion === 'CAPITAL_AI_CONTENT_ENGINE@1'
    && plan.publication?.publicPublishAllowed === false
    && plan.modules?.some(module => module.module === 'COPY' && module.state === 'READY_FOR_DRAFT')
    && plan.campaign?.channels?.includes('LINKEDIN'), 'LINKEDIN_COPY_PLAN_NOT_ADMITTED');
  requireCondition(socialPackage?.contractVersion === 'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1'
    && socialPackage.publicationAuthority === 'SOCIAL_MEDIA_ENGINE_ONLY'
    && socialPackage.campaignId === plan.campaign.campaignId
    && socialPackage.sourceSha === plan.campaign.sourceSha
    && socialPackage.canonicalUrl === plan.campaign.canonicalUrl
    && socialPackage.contentId === 'learning'
    && Array.isArray(socialPackage.approvals) && socialPackage.approvals.length === 0
    && Array.isArray(socialPackage.deliveries) && socialPackage.deliveries.length === 0,
  'LINKEDIN_COPY_SOURCE_PACKAGE_MISMATCH');
  const draft = Array.isArray(drafts) ? drafts.find(item => item.id === draftId) : undefined;
  requireCondition(draft?.state === 'DRAFT' && draft.review === 'REVIEW_REQUIRED'
    && draft.canonicalUrl === socialPackage.canonicalUrl
    && typeof draft.text === 'string'
    && draft.text.includes('Alle Zahlen sind synthetisch; keine Prognose oder Anlageberatung.'),
  'LINKEDIN_COPY_EDITORIAL_SOURCE_INVALID');
  const sourceAssetId = 'learning-' + draftId + '-text';
  const originals = socialPackage.assets?.filter(item => item.assetId === sourceAssetId) ?? [];
  const original = originals[0];
  requireCondition(originals.length === 1
    && original.kind === 'TEXT'
    && original.sourceSha === socialPackage.sourceSha
    && digest.test(original.sha256)
    && original.sha256 === sha256(draft.text)
    && original.evidenceRef === 'owned-content:shared/learning-journey.mjs#' + draftId,
  'LINKEDIN_COPY_SOURCE_HASH_MISMATCH');

  const postText = [
    'Finanzanalyse verstehen – ohne Renditeversprechen.',
    draft.text.trim(),
    'Weitere kostenlose Lernbeispiele im CAPITAL-AI Learning Hub.',
    '#Finanzbildung #FinTech #CAPITALAI',
  ].join('\n\n');
  requireCondition(postText.length <= 3000, 'LINKEDIN_COPY_TOO_LONG');
  const asset = Object.freeze({
    assetId: 'learning-' + draftId + '-linkedin-text',
    contentId: socialPackage.contentId,
    kind: 'TEXT',
    sha256: sha256(postText),
    mimeType: 'text/plain',
    evidenceRef: original.evidenceRef,
    sourceSha: socialPackage.sourceSha,
  });
  return Object.freeze({
    channel: 'LINKEDIN', state: 'DRAFT', review: 'REVIEW_REQUIRED',
    publicPublishAllowed: false, sourceAssetSha256: original.sha256,
    text: postText, asset,
  });
}
