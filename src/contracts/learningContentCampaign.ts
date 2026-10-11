import { LEARNING_JOURNEY } from '../../shared/learning-journey.mjs';
import { seoContentForPath } from '../../shared/seo-content-manifest.mjs';
import { planContentCampaign } from './contentEngine';
import { buildDraftContentSocialPackage } from './contentSocialPackage';

/** Deterministic owned-content adaptation. No provider call or publish authority. */
export async function buildLearningContentCampaign() {
  const entry = seoContentForPath('/learning');
  if (!entry?.searchEligible || !entry.socialEligible) throw Error('LEARNING_CONTENT_NOT_ELIGIBLE');
  // Actual source-set identity, rather than claiming the historical generation anchor is current Main.
  const sourceSha = entry.contentDigest.slice('sha256:'.length);
  const campaign = {
    campaignId: 'capital-ai-learning-methodology', productId: 'learning-portal', sourceSha,
    canonicalUrl: entry.canonical, locale: 'de-DE' as const,
    objective: 'Kostenlose mathematische Lernbeispiele zu einem überprüfbaren Learning-Angebot führen.',
    audience: ['Studierende und Lernende', 'Fintech-Teams', 'Trader mit Lerninteresse'],
    channels: ['WEBSITE', 'LINKEDIN'] as ('WEBSITE' | 'LINKEDIN')[], outputs: ['TEXT', 'ANALYTICS'] as ('TEXT' | 'ANALYTICS')[],
    sourceUrls: [entry.canonical],
  };
  const drafts = LEARNING_JOURNEY.map(lesson => ({
    id: lesson.id, intent: lesson.intent, learningGoal: lesson.goal,
    text: `${lesson.title}\n${lesson.goal}\n${lesson.example}\nAlle Zahlen sind synthetisch; keine Prognose oder Anlageberatung.\nKostenlos weiterlesen: ${entry.canonical}#${lesson.id}`,
    canonicalUrl: entry.canonical, relatedLinks: lesson.links,
    state: 'DRAFT' as const, review: 'REVIEW_REQUIRED' as const,
  }));
  const assets = await Promise.all(drafts.map(async draft => {
    const bytes = new TextEncoder().encode(draft.text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return { assetId: `learning-${draft.id}-text`, contentId: entry.slug, kind: 'TEXT' as const,
      sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''),
      mimeType: 'text/plain', evidenceRef: `owned-content:shared/learning-journey.mjs#${draft.id}`, sourceSha };
  }));
  return { plan: planContentCampaign(campaign), drafts,
    socialPackage: buildDraftContentSocialPackage({ campaign, contentId: entry.slug, assets }),
    sourceIdentityType: 'CONTENT_SOURCE_SET_SHA256',
    measurement: { search: 'GSC clicks/impressions by canonical URL', traffic: 'Consented GA4 organic sessions',
      leads: 'generate_lead after SMTP acknowledgement', purchases: 'NOT_PROVEN' },
    publicPublishAllowed: false, externalCalls: 0 };
}
