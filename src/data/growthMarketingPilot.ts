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
  canonicalUrl: 'https://capital-ai.online/learning',
  locale: 'de-DE' as const,
  objective: 'Verständliche Chartanalyse, Datenprovenienz und Lernmethoden kommunizieren; keine Anlage- oder Score-Erfolgsversprechen.',
  audience: ['Erwachsene Finanzlernende', 'FinTech-Entwickler', 'Research-Teams'],
  channels: ['WEBSITE', 'X'] as ('WEBSITE' | 'X')[],
  outputs: ['TEXT', 'ANALYTICS'] as ('TEXT' | 'ANALYTICS')[],
  sourceUrls: [articleSource, 'https://capital-ai.online/learning'],
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
  snapshotDate: '2026-10-14',
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
  { id: 'source', titleDe: 'Quellen und Datenregeln', titleEn: 'Source & data contract',
    detailDe: 'Quellen sind PR-Merges, Website-Inhalte und konkrete X-Links. Externe Aussagen gelten zunächst als ungeprüft.',
    detailEn: 'PR merge, website and explicitly provided X post URLs; third-party claims remain unverified.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/data/growthMarketingPilot.ts' },
  { id: 'draft', titleDe: 'Entwurf erstellen', titleEn: 'Editorial draft',
    detailDe: 'Text und Datei-Hash werden im Content-Paket abgelegt. Der Entwurf wartet auf Freigabe.',
    detailEn: 'Copy and SHA-256 asset in the existing content/social package; never auto-posted.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/contracts/contentSocialPackage.ts' },
  { id: 'review', titleDe: 'Aussagen und Rechte prüfen', titleEn: 'Claims & rights',
    detailDe: 'Prüfe die Aussagen fachlich und kläre die Nutzungsrechte je Kanal.',
    detailEn: 'Editorial review and channel-specific permissions remain required.',
    status: 'REVIEW_REQUIRED', evidencePath: 'src/contracts/socialPublisherAdapter.ts' },
  { id: 'render', titleDe: 'Vorschau erstellen', titleEn: 'Asset & preview',
    detailDe: 'Eine Textvorschau ist vorhanden. Bild, Video und Ausspielung sind offen.',
    detailEn: 'Text prototype exists; image, video and final delivery remain open.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/data/growthMarketingPilot.ts' },
  { id: 'schedule', titleDe: 'Zeitplan und Budget', titleEn: 'Scheduling & budget',
    detailDe: 'Zum Guthaben liegt eine Owner-Angabe vor. Zeitplan und Ausgabenlimit sind offen.',
    detailEn: 'Owner-reported $20 X credit; scheduler and spend cap unverified.',
    status: 'NOT_PROVEN', evidencePath: 'docs/growth/SEO-LEADGEN-FOLLOWUP-20261014.md' },
  { id: 'publish', titleDe: 'X-Zugang für den Owner', titleEn: 'Owner-only X OAuth2',
    detailDe: 'Der Code sieht einen einmaligen Artikeltest mit verschlüsselter Token-Erneuerung vor.',
    detailEn: 'Owner-only single-article route with encrypted on-demand refresh; not an autonomous publisher.',
    status: 'NOT_PROVEN', evidencePath: 'server/social-media/x-article-test.mjs' },
  { id: 'measure', titleDe: 'Abruf und SEO prüfen', titleEn: 'Readback & SEO',
    detailDe: 'Prüfe Post-ID, X-Kosten und Website-Conversions anhand externer Nachweise.',
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

/**
 * Existing pathways shown side by side. Static code-status projection only:
 * provider success, production status, audio rights and URL cost readbacks
 * are separately verified. No autonomous provider calls.
 */
export const GROWTH_CONTENT_ADAPTERS = Object.freeze([
  {
    id: 'pr_blog', titleDe: 'GitHub-App → PR-Blog', titleEn: 'GitHub app → PR blog',
    detailDe: 'Gemergte PRs können Blogentwürfe mit Quellenbezug liefern. Vor der Veröffentlichung prüft die Redaktion den Entwurf.',
    detailEn: 'Merged PRs produce source-bound draft candidates; the website blog requires editorial approval.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'scripts/growth/social-release-candidate.mjs',
  },
  {
    id: 'x_context', titleDe: 'X-Beitrag als Kontext', titleEn: 'X → URL context',
    detailDe: 'Der Owner kann einen öffentlichen X-Beitrag per URL abrufen. Der Kontext gilt als ungeprüft und ist für Entwürfe vorgesehen.',
    detailEn: 'Owner-only OAuth2 lookup of one public X Post URL; untrusted context, draft-only.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'server/social-media/x-url-context.mjs',
  },
  {
    id: 'social_engine', titleDe: 'Social Media Engine', titleEn: 'Migrated Social Media Engine',
    detailDe: 'Medienprojekt, Dateihash, Review und Provider-Übergabe sind im Code abgebildet. Automatisches Publishing ist gesperrt.',
    detailEn: 'MediaProjectV2, asset hashes, review and provider handoff exist; autonomous public publishing stays blocked.',
    status: 'REPO_IMPLEMENTED', evidencePath: 'src/platform/SocialMediaEngine/Publishing/MediaProjectPublisherBridge.ts',
  },
  {
    id: 'youtube', titleDe: 'YouTube OAuth2 und Shorts', titleEn: 'YouTube OAuth2 / Shorts',
    detailDe: 'Für private Uploads gibt es einen eigenen Zugang mit separater Token-Auflösung.',
    detailEn: 'Separate private upload route and token resolver exist; no autonomous public video publication.',
    status: 'REVIEW_REQUIRED', evidencePath: 'server/social-media/youtube-private-upload.mjs',
  },
  {
    id: 'gemini_tts', titleDe: 'Gemini TTS und Video-Podcast', titleEn: 'Gemini TTS / video podcast',
    detailDe: 'Audioentwürfe haben ein Budgetlimit. Für Videos gibt es ein Storyboard. Audioerstellung und Publikationsrechte sind noch zu belegen.',
    detailEn: 'Budget-gated server-side TTS draft and video storyboard exist; produced audio and publication rights are unproven.',
    status: 'REVIEW_REQUIRED', evidencePath: 'server/growth-ai-gateway.ts',
  },
] as const);
