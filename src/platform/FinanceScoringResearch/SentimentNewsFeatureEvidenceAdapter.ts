import type {
  SentimentNumericFeatureEvidence,
  SentimentScoringFeatureName,
} from './SentimentEvidenceProjection';

export const SENTIMENT_NEWS_FEATURE_ADAPTER_VERSION =
  'sentiment-news-feature-adapter/1.0.0' as const;
export const SENTIMENT_NEWS_EVIDENCE_WINDOW_HOURS = 24 as const;
export const SENTIMENT_NEWS_MENTION_SATURATION_COUNT = 20 as const;

export interface SentimentNewsFeatureEvidenceInput {
  readonly evidenceRef: string;
  readonly publishedAt: string;
  readonly headline: string;
}

export type SentimentNewsFeatureAttestations =
  Readonly<Partial<Record<SentimentScoringFeatureName, SentimentNumericFeatureEvidence>>>;

const NOVELTY_METHOD = 'news-exact-headline-novelty/1.0.0';
const MENTION_INTENSITY_METHOD = 'news-evidence-count-24h/1.0.0';

function normalizeHeadline(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function finiteTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundedUnit(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(6));
}

/**
 * Pure FINTECH feature-engineering adapter over already verified news metadata.
 *
 * It deliberately attests only features that can be reproduced from the observed evidence
 * window itself:
 * - novelty: exact normalized-headline uniqueness within the governed 24h window;
 * - mentionIntensity: unique evidence count in that same window, normalized to a versioned
 *   saturation count.
 *
 * It does not infer polarity/intensity, source trust/credibility, bot probability or market
 * regime. Those require separate governed evidence and therefore remain unavailable.
 */
export function buildNewsDerivedSentimentFeatureAttestations(
  evidence: readonly SentimentNewsFeatureEvidenceInput[],
  nowMs = Date.now(),
): ReadonlyMap<string, SentimentNewsFeatureAttestations> {
  const windowMs = SENTIMENT_NEWS_EVIDENCE_WINDOW_HOURS * 60 * 60 * 1_000;
  const recent = evidence.filter(item => {
    const ref = item.evidenceRef.trim();
    const observedMs = finiteTimestamp(item.publishedAt);
    return Boolean(ref)
      && observedMs !== null
      && observedMs <= nowMs
      && observedMs >= nowMs - windowMs;
  });

  const uniqueRefs = Object.freeze(
    [...new Set(recent.map(item => item.evidenceRef.trim()))].sort(),
  );
  if (uniqueRefs.length === 0) return new Map();

  const mentionIntensity = roundedUnit(
    uniqueRefs.length / SENTIMENT_NEWS_MENTION_SATURATION_COUNT,
  );
  const mentionEvidence: SentimentNumericFeatureEvidence = Object.freeze({
    value: mentionIntensity,
    evidenceRefs: uniqueRefs,
    method: MENTION_INTENSITY_METHOD,
  });

  const headlineClusters = new Map<string, string[]>();
  for (const item of recent) {
    const key = normalizeHeadline(item.headline);
    if (!key) continue;
    const refs = headlineClusters.get(key) ?? [];
    refs.push(item.evidenceRef.trim());
    headlineClusters.set(key, refs);
  }

  const result = new Map<string, SentimentNewsFeatureAttestations>();
  for (const item of recent) {
    const ref = item.evidenceRef.trim();
    const headlineKey = normalizeHeadline(item.headline);
    const clusterRefs = headlineKey
      ? Object.freeze([...new Set(headlineClusters.get(headlineKey) ?? [])].sort())
      : Object.freeze([] as string[]);

    const attestations: Partial<Record<SentimentScoringFeatureName, SentimentNumericFeatureEvidence>> = {
      mentionIntensity: mentionEvidence,
    };
    if (clusterRefs.length > 0) {
      attestations.novelty = Object.freeze({
        value: roundedUnit(1 / clusterRefs.length),
        evidenceRefs: clusterRefs,
        method: NOVELTY_METHOD,
      });
    }
    result.set(ref, Object.freeze(attestations));
  }

  return result;
}
