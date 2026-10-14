// CAPITAL_AI_GROWTH_FIRST_X_PILOT@1
// Source-bound, educational social prototype. No browser/provider mutation authority.
import { buildDraftContentSocialPackage } from '../contracts/contentSocialPackage.ts';
import { planContentCampaign } from '../contracts/contentEngine.ts';

export const FIRST_X_PILOT_SOURCE_SHA = '48face2c9cf767f256000b8701545665674a8048' as const;
export const FIRST_X_PILOT_TEXT = 'Ein RSI im Extrembereich ist noch kein Handelssignal. 📊 Unser neuer Lernartikel zeigt 5 Fragen, die vor jeder Chartanalyse helfen: Zeitfenster, Candlesticks, Trend, Volatilität und Gegenargumente. #TradingEducation #Chartanalyse' as const;
export const FIRST_X_PILOT_TEXT_SHA256 = '58d0418a06ebc1bc41af2054f47ac7d47d2f7dc56f6ede102be8c37ef270848b' as const;
export const FIRST_X_PILOT_ARTICLE_TITLE = 'Chartanalyse ohne Signal-Mythen: 5 Fragen vor jedem Indikator' as const;
const articleSource = 'https://github.com/SvenKulessa/Capital-AI/blob/' + FIRST_X_PILOT_SOURCE_SHA + '/server/social-media/x-article-test.mjs';
export const FIRST_X_PILOT_CAMPAIGN = {
  campaignId: 'capital-ai-evidence-learning-x-pilot-20261014',
  productId: 'capital-ai-learning-portal',
  sourceSha: FIRST_X_PILOT_SOURCE_SHA,
  canonicalUrl: 'https://capital-ai.online/learning-platform',
  locale: 'de-DE' as const,
  objective: 'Verständliche Chartanalyse, Datenprovenienz und Lernmethoden kommunizieren; keine Anlage- oder Score-Erfolgsversprechen.',
  audience: ['Erwachsene Finanzlernende', 'FinTech-Entwickler', 'Research-Teams'],
  channels: ['WEBSITE', 'X'] as ('WEBSITE' | 'X')[],
  outputs: ['TEXT', 'ANALYTICS'] as ('TEXT' | 'ANALYTICS')[],
  sourceUrls: [articleSource, 'https://capital-ai.online/learning-platform'],
};
export const FIRST_X_PILOT_CONTENT_ID = 'capital-ai-x-chartanalyse-20261014' as const;
export const FIRST_X_PILOT_PLAN = planContentCampaign(FIRST_X_PILOT_CAMPAIGN);
export const FIRST_X_PILOT_PACKAGE = buildDraftContentSocialPackage({
  campaign: FIRST_X_PILOT_CAMPAIGN,
  contentId: FIRST_X_PILOT_CONTENT_ID,
  assets: [{
    assetId: 'capital-ai-x-chartanalyse-text-v1',
    contentId: FIRST_X_PILOT_CONTENT_ID,
    kind: 'TEXT',
    sha256: FIRST_X_PILOT_TEXT_SHA256,
    mimeType: 'text/plain; charset=utf-8',
    evidenceRef: articleSource,
    sourceSha: FIRST_X_PILOT_SOURCE_SHA,
  }],
});
export const FIRST_X_PILOT_STATE = Object.freeze({
  status: 'DRAFT',
  review: 'REVIEW_REQUIRED',
  published: 'NOT_PROVEN',
  runtimeReceipt: 'NOT_PROVEN',
  channel: 'X',
  targetHandle: '@CapitalAIOnline',
  manualOwnerArticleRoute: '/api/social-media/x/article-test',
  articleTitle: FIRST_X_PILOT_ARTICLE_TITLE,
  targetUrl: FIRST_X_PILOT_CAMPAIGN.canonicalUrl,
  providerCalls: 0,
  publicPublishAllowed: false,
  scheduled: false,
  articleSource,
  contentSha256: FIRST_X_PILOT_TEXT_SHA256,
});
export type GrowthSocialStageStatus = 'REPO_IMPLEMENTED' | 'REVIEW_REQUIRED' | 'NOT_PROVEN';
export const GROWTH_SOCIAL_PROCESS_STAGES: readonly {
  id: string; titleDe: string; titleEn: string; detailDe: string; detailEn: string;
  status: GrowthSocialStageStatus; evidencePath: string;
}[] = Object.freeze([
  { id: 'source', titleDe: 'Quelle & Datenvertrag', titleEn: 'Source & data contract',
    detailDe: 'Lern- und Architekturquellen mit Commit-Bezug, ohne Live-Scoring-Claims.',
    detailEn: 'Learning and architecture references pinned to a commit; no live-scoring claims.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/data/growthMarketingPilot.ts' },
  { id: 'draft', titleDe: 'Content-Entwurf', titleEn: 'Editorial draft',
    detailDe: 'Copy und SHA-256-Asset im vorhandenen Content-/Social-Package; niemals automatisch gepostet.',
    detailEn: 'Copy and SHA-256 asset in the existing content/social package; never auto-posted.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/contracts/contentSocialPackage.ts' },
  { id: 'review', titleDe: 'Claims & Rechte', titleEn: 'Claims & rights',
    detailDe: 'Fachliches Review und kanalbezogene Freigaben bleiben erforderlich.',
    detailEn: 'Editorial review and channel-specific permissions remain required.',
    status: 'REVIEW_REQUIRED', evidencePath: 'src/contracts/socialPublisherAdapter.ts' },
  { id: 'render', titleDe: 'Asset & Vorschau', titleEn: 'Asset & preview',
    detailDe: 'Text-Prototyp vorhanden; Bild, Video und endgültige Ausspielung offen.',
    detailEn: 'Text prototype exists; image, video and final delivery remain open.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/data/growthMarketingPilot.ts' },
  { id: 'schedule', titleDe: 'Planung & Budget', titleEn: 'Scheduling & budget',
    detailDe: '20-USD-X-Credit nur als Owner-Angabe; Zeitplan und Spend-Cap nicht live nachgewiesen.',
    detailEn: 'Owner-reported $20 X credit; scheduler and spend cap unverified.',
    status: 'NOT_PROVEN', evidencePath: 'docs/growth/SEO-LEADGEN-FOLLOWUP-20261014.md' },
  { id: 'publish', titleDe: 'Owner-only X OAuth2', titleEn: 'Owner-only X OAuth2',
    detailDe: 'Einmaliger Artikelpfad mit verschlüsseltem On-Demand-Refresh existiert; kein autonomer Feed-Publisher.',
    detailEn: 'Owner-only single-article route with encrypted on-demand refresh; not an autonomous publisher.',
    status: 'NOT_PROVEN', evidencePath: 'server/social-media/x-article-test.mjs' },
  { id: 'measure', titleDe: 'Readback & SEO', titleEn: 'Readback & SEO',
    detailDe: 'Publisher-ID, X-Kosten und Website-Konversionen erst mit externem Readback verifizieren.',
    detailEn: 'Provider IDs, X spend and website conversions require external readback.',
    status: 'NOT_PROVEN', evidencePath: 'docs/growth/SEO-LEADGEN-FOLLOWUP-20261014.md' },
]);
export const GROWTH_X_TEST_BUDGET = Object.freeze({
  ownerReportedCreditUsd: 20,
  proposedPilotAllocationUsd: 3,
  maxUnattendedExternalSpendUsd: 0,
  proposedPercentages: Object.freeze({
    contentPublishing: 40, qualifiedDiscovery: 15, permittedAnalytics: 15,
    oauthIdentityReadback: 10, contingency: 20,
  }),
  automaticFollowsAllowed: false,
  unsolicitedRepliesAllowed: false,
  unsolicitedMarketingEmailAllowed: false,
  liveBalanceVerified: false,
});
