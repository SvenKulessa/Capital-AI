/**
 * CADS Growth quality profile: evaluates independently verifiable contracts only.
 * This is intentionally NOT an authorization, license decision, scoring model,
 * paid CADS feature, or replacement for the canonical publisher.
 */
import { BENCHMARK_SCHEMA_VERSION } from './index.mjs';

export const CADS_GROWTH_PROFILE = 'CAPITAL_AI_CADS_GROWTH_QUALITY@1';

function result(profile, checks) {
  const failures = checks.filter(c => c.status === 'FAIL');
  return Object.freeze({
    schemaVersion: CADS_GROWTH_PROFILE,
    benchmarkEvidenceSchema: BENCHMARK_SCHEMA_VERSION,
    profile,
    technicalStatus: failures.length ? 'FAIL' : 'PASS',
    checks: Object.freeze(checks.map(check => Object.freeze({ ...check }))),
    editorialReview: 'REVIEW_REQUIRED',
    actualAssetBytes: 'NOT_PROVEN',
    providerRights: 'NOT_PROVEN',
    productionApproval: false,
    securityApproval: false,
    licenseApproval: false,
    publicationApproval: false,
    customerPurchaseApproval: false,
  });
}
function check(code, ok) {
  return { code, status: ok ? 'PASS' : 'FAIL' };
}
const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const SHA256 = /^[0-9a-f]{64}$/;
function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && !url.port && url.hostname.includes('.') && !url.hostname.endsWith('.local');
  } catch { return false; }
}
export function assessCadsContentCampaign(campaign) {
  const checks = [
    check('CONTENT_SOURCE_COMMIT', SHA.test(campaign?.sourceSha ?? '')),
    check('CONTENT_CAMPAIGN_IDENTITY', typeof campaign?.campaignId === 'string' && campaign.campaignId.trim().length >= 4),
    check('CONTENT_CANONICAL_HTTPS', validUrl(campaign?.canonicalUrl)),
    check('CONTENT_AUDIENCE_DEFINED', Array.isArray(campaign?.audience) && campaign.audience.length > 0),
    check('CONTENT_CHANNELS_DEFINED', Array.isArray(campaign?.channels) && campaign.channels.length > 0),
  ];
  return result('CONTENT_ENGINE_DRAFT', checks);
}
export function assessCadsMediaProject(project) {
  const recipe = project?.renderRecipe;
  const checks = [
    check('SOCIAL_BRANDING_CANONICAL', recipe?.brandTokenSource === 'public/branding/asset-pack/meta/social-render-tokens.json'),
    check('SOCIAL_PUBLISHER_INDEPENDENT', recipe?.publishReady === false),
    check('SOCIAL_NETWORK_BOUNDARY', recipe?.networkPolicy === 'offline' || recipe?.networkPolicy === 'provider-isolated'),
    check('SOCIAL_DISCLOSURE_REQUIRED', project?.disclosure?.requireAtProjectEdges === true),
    check('SOCIAL_MEDIA_IDENTITY', typeof project?.projectId === 'string' && project.projectId.length > 3),
  ];
  return result('SOCIAL_MEDIA_ENGINE_DRAFT', checks);
}
export function assessCadsAssetIdentity(asset, campaign) {
  const checks = [
    check('SOCIAL_ASSET_SHA256', SHA256.test(asset?.sha256 ?? '')),
    check('SOCIAL_SOURCE_SHA_MATCH', SHA.test(asset?.sourceSha ?? '') && asset?.sourceSha === campaign?.sourceSha),
    check('SOCIAL_CONTENT_ID_MATCH', typeof asset?.contentId === 'string' && asset.contentId === campaign?.contentId),
    check('SOCIAL_MIME_ALLOWED', ['image/png','image/jpeg','image/webp','image/avif','image/svg+xml','video/mp4','video/webm'].includes(asset?.mimeType)),
  ];
  return result('SOCIAL_RENDERED_ASSET_IDENTITY', checks);
}
