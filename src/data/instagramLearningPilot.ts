import { buildDraftContentSocialPackage } from '../contracts/contentSocialPackage.ts';
import { planContentCampaign } from '../contracts/contentEngine.ts';
export const INSTAGRAM_PILOT_SOURCE_SHA = 'fea4dbc49721ef50131063791db7fac2f4c399ab' as const;
export const INSTAGRAM_PILOT_CONTENT_ID = 'capital-ai-instagram-etf-kosten-20261110' as const;
export const INSTAGRAM_PILOT_SLIDES = [
  {
    "id": "etf-kosten-01",
    "path": "/learning/social/etf-kosten-01.svg",
    "title": "ETF-Kosten",
    "alt": "Grafik 1: Drei ETF-Kostenarten, Ordergebuehr, Spread und laufende Fondskosten.",
    "sha256": "a6e90969e0422c0f3ab36ccc2b018056de390886ce1937203a2c687b550b2cc7"
  },
  {
    "id": "etf-kosten-02",
    "path": "/learning/social/etf-kosten-02.svg",
    "title": "Spread-Rechenbeispiel",
    "alt": "Grafik 2: Synthetische Kurse Ask 100,10 Euro und Bid 99,90 Euro, Spread 0,20 Euro.",
    "sha256": "328e37761e3045428bc585d7dd9c207cc8193ca57e4bfeb553740599a15aca18"
  },
  {
    "id": "etf-kosten-03",
    "path": "/learning/social/etf-kosten-03.svg",
    "title": "Checkliste",
    "alt": "Grafik 3: Checkliste zu Orderkosten, Spread, Fondskosten und Anlagerisiko.",
    "sha256": "6f0c4c37e07ce076ccafec108ac75d806778f9244ca317af695df605b071629c"
  }
] as const;
export const INSTAGRAM_PILOT_CAPTION = "ETF kaufen: Wo entstehen Kosten?\n\nOrdergebuehren, Bid-Ask-Spread und laufende Fondskosten sind unterschiedliche Kostenarten. Unser fiktives Beispiel zeigt einen Kaufkurs von 100,10 EUR und einen Verkaufskurs von 99,90 EUR. Die Differenz, der Spread, betraegt 0,20 EUR pro Anteil im betrachteten Moment.\n\nAlle Zahlen sind synthetisch, keine Live-Kurse. Risiken und Zeithorizont sind ebenfalls wichtig.\n\nMehr kostenloses Finanzwissen: capital-ai.online/learning (Link im Profil).\n\nAllgemeine Finanzbildung. Keine individuelle Anlageberatung oder Handelsempfehlung.\n\n#Finanzbildung #ETFGrundlagen #Spread #CapitalAI" as const;
export const INSTAGRAM_PILOT_CAMPAIGN = {
  campaignId: 'capital-ai-instagram-etf-learning-v1',
  productId: 'capital-ai-learning-portal',
  sourceSha: INSTAGRAM_PILOT_SOURCE_SHA,
  canonicalUrl: 'https://capital-ai.online/learning',
  locale: 'de-DE' as const,
  objective: 'ETF-Kosten und Spread mit rein synthetischen Beispielen erklaeren, ohne Anlageempfehlung.',
  audience: ['Erwachsene deutschsprachige Finanzlernende'],
  channels: ['WEBSITE', 'INSTAGRAM'] as ('WEBSITE' | 'INSTAGRAM')[],
  outputs: ['TEXT', 'IMAGE'] as ('TEXT' | 'IMAGE')[],
  sourceUrls: ['https://github.com/SvenKulessa/Capital-AI/blob/'+INSTAGRAM_PILOT_SOURCE_SHA+'/shared/learning-journey.mjs',
    'https://capital-ai.online/learning'],
};
export const INSTAGRAM_PILOT_PLAN = planContentCampaign(INSTAGRAM_PILOT_CAMPAIGN);
export const INSTAGRAM_PILOT_PACKAGE = buildDraftContentSocialPackage({
  campaign: INSTAGRAM_PILOT_CAMPAIGN,
  contentId: INSTAGRAM_PILOT_CONTENT_ID,
  assets: INSTAGRAM_PILOT_SLIDES.map(slide => ({
    assetId: slide.id, contentId: INSTAGRAM_PILOT_CONTENT_ID,
    kind: 'IMAGE' as const, sha256: slide.sha256, mimeType: 'image/svg+xml',
    evidenceRef: 'public'+slide.path, sourceSha: INSTAGRAM_PILOT_SOURCE_SHA,
  })),
});
export const INSTAGRAM_PILOT_STATUS = Object.freeze({
  channel: 'INSTAGRAM', status: 'DRAFT', review: 'REVIEW_REQUIRED',
  published: 'NOT_PROVEN', publicPublishAllowed: false, providerCalls: 0,
  scheduled: false, costAuthorized: false,
});
