import {
  CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION,
  evaluateSentimentResearch,
  type SentimentResearchItem,
} from './CryptoOrchestratorResearchModels';

export const SENTIMENT_FEATURE_CONTRACT_VERSION = 'sentiment-feature-contract/1.0.0' as const;
export const MARKET_SENTIMENT_PROJECTION_VERSION = 'market-sentiment-projection/1.0.0' as const;

const REQUIRED_SENTIMENT_FEATURES = [
  'polarity',
  'intensity',
  'novelty',
  'credibility',
  'botProbability',
  'sourceWeight',
  'mentionIntensity',
  'regimeAdjustment',
] as const;

export type SentimentScoringFeatureName = typeof REQUIRED_SENTIMENT_FEATURES[number];
export type SentimentFeatureAttestationStatus = 'ATTESTED' | 'UNAVAILABLE' | 'INVALID';
export type MarketSentimentProjectionStatus = 'READY' | 'NOT_COMPUTABLE' | 'SOURCE_UNAVAILABLE';

export interface SentimentNumericFeatureEvidence {
  readonly value: number;
  readonly evidenceRefs: readonly string[];
  readonly method: string;
}

export interface SentimentProviderEvidence {
  readonly evidenceRef: string;
  readonly provider: string;
  readonly source: string;
  readonly publishedAt: string;
  readonly headline: string;
  readonly sentimentLabel?: 'positive' | 'negative' | 'neutral';
  readonly sentimentBasis?: string;
  /**
   * Only a governed upstream adapter may mark an observation as a score candidate.
   * Raw news metadata and the headline heuristic are context-only and MUST leave this false.
   */
  readonly scoreCandidate: boolean;
  readonly attestedFeatures?: Partial<Record<SentimentScoringFeatureName, SentimentNumericFeatureEvidence>>;
}

export interface SentimentFeatureAttestation {
  readonly feature: SentimentScoringFeatureName;
  readonly status: SentimentFeatureAttestationStatus;
  readonly value: number | null;
  readonly evidenceRefs: readonly string[];
  readonly method: string | null;
  readonly reason: string | null;
}

export interface SentimentEvidenceItemAttestation {
  readonly evidenceRef: string;
  readonly provider: string;
  readonly source: string;
  readonly publishedAt: string;
  readonly ageHours: number | null;
  readonly ageStatus: 'ATTESTED' | 'INVALID';
  readonly scoreCandidate: boolean;
  readonly features: Readonly<Record<SentimentScoringFeatureName, SentimentFeatureAttestation>>;
  readonly complete: boolean;
}

export interface MarketSentimentDriverProjection {
  readonly title: string;
  readonly description: string;
  readonly direction: 'up' | 'down' | 'neutral';
}

export interface AttestedMarketSentimentProjection {
  readonly projectionVersion: typeof MARKET_SENTIMENT_PROJECTION_VERSION;
  readonly contractVersion: typeof SENTIMENT_FEATURE_CONTRACT_VERSION;
  readonly category: 'KRYPTO';
  readonly status: MarketSentimentProjectionStatus;
  readonly score: number | null;
  readonly label: string | null;
  readonly summary: string;
  readonly history30d: readonly [];
  readonly drivers: readonly MarketSentimentDriverProjection[];
  readonly modelVersion: typeof CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION;
  readonly evidenceIds: readonly string[];
  readonly observedAt: string | null;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_CONTEXT_ONLY';
  readonly attestation: {
    readonly evidenceCount: number;
    readonly scoreCandidateCount: number;
    readonly completeCandidateCount: number;
    readonly missingFeatures: readonly SentimentScoringFeatureName[];
    readonly invalidEvidenceRefs: readonly string[];
    readonly items: readonly SentimentEvidenceItemAttestation[];
  };
}

function finiteBetween(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validFeatureValue(feature: SentimentScoringFeatureName, value: number): boolean {
  return feature === 'polarity'
    ? finiteBetween(value, -1, 1)
    : finiteBetween(value, 0, 1);
}

function normalizedEvidenceRefs(refs: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(refs.map(ref => ref.trim()).filter(Boolean))].sort());
}

function attestFeature(
  feature: SentimentScoringFeatureName,
  value: SentimentNumericFeatureEvidence | undefined,
): SentimentFeatureAttestation {
  if (!value) {
    return Object.freeze({
      feature,
      status: 'UNAVAILABLE' as const,
      value: null,
      evidenceRefs: Object.freeze([]),
      method: null,
      reason: 'No governed provider/evidence adapter attested this required feature.',
    });
  }

  const refs = normalizedEvidenceRefs(value.evidenceRefs);
  if (!validFeatureValue(feature, value.value) || refs.length === 0 || !value.method.trim()) {
    return Object.freeze({
      feature,
      status: 'INVALID' as const,
      value: null,
      evidenceRefs: refs,
      method: value.method.trim() || null,
      reason: 'Attestation is outside the governed numeric range or has no evidence reference/method.',
    });
  }

  return Object.freeze({
    feature,
    status: 'ATTESTED' as const,
    value: value.value,
    evidenceRefs: refs,
    method: value.method.trim(),
    reason: null,
  });
}

function observedAgeHours(publishedAt: string, nowMs: number): { value: number | null; status: 'ATTESTED' | 'INVALID' } {
  const parsed = Date.parse(publishedAt);
  if (Number.isNaN(parsed) || parsed > nowMs + 5 * 60_000) {
    return { value: null, status: 'INVALID' };
  }
  return { value: Math.max(0, (nowMs - parsed) / 3_600_000), status: 'ATTESTED' };
}

function buildItemAttestation(item: SentimentProviderEvidence, nowMs: number): SentimentEvidenceItemAttestation {
  const featureEntries = REQUIRED_SENTIMENT_FEATURES.map(feature => [
    feature,
    attestFeature(feature, item.attestedFeatures?.[feature]),
  ] as const);
  const features = Object.freeze(
    Object.fromEntries(featureEntries),
  ) as Readonly<Record<SentimentScoringFeatureName, SentimentFeatureAttestation>>;
  const age = observedAgeHours(item.publishedAt, nowMs);
  const complete = item.scoreCandidate
    && age.status === 'ATTESTED'
    && REQUIRED_SENTIMENT_FEATURES.every(feature => features[feature].status === 'ATTESTED');

  return Object.freeze({
    evidenceRef: item.evidenceRef,
    provider: item.provider,
    source: item.source,
    publishedAt: item.publishedAt,
    ageHours: age.value,
    ageStatus: age.status,
    scoreCandidate: item.scoreCandidate,
    features,
    complete,
  });
}

function toResearchItem(attestation: SentimentEvidenceItemAttestation): SentimentResearchItem | null {
  if (!attestation.complete || attestation.ageHours === null) return null;

  const values = Object.fromEntries(
    REQUIRED_SENTIMENT_FEATURES.map(feature => [feature, attestation.features[feature].value]),
  ) as Record<SentimentScoringFeatureName, number | null>;
  if (REQUIRED_SENTIMENT_FEATURES.some(feature => values[feature] === null)) return null;

  const evidenceRefs = normalizedEvidenceRefs([
    attestation.evidenceRef,
    ...REQUIRED_SENTIMENT_FEATURES.flatMap(feature => attestation.features[feature].evidenceRefs),
  ]);
  if (evidenceRefs.length === 0) return null;

  return Object.freeze({
    polarity: values.polarity as number,
    intensity: values.intensity as number,
    novelty: values.novelty as number,
    credibility: values.credibility as number,
    botProbability: values.botProbability as number,
    ageHours: attestation.ageHours,
    sourceWeight: values.sourceWeight as number,
    mentionIntensity: values.mentionIntensity as number,
    regimeAdjustment: values.regimeAdjustment as number,
    evidenceRefs,
  });
}

function driverDirection(value: SentimentProviderEvidence['sentimentLabel']): MarketSentimentDriverProjection['direction'] {
  if (value === 'positive') return 'up';
  if (value === 'negative') return 'down';
  return 'neutral';
}

function latestObservedAt(items: readonly SentimentProviderEvidence[]): string | null {
  const timestamps = items
    .map(item => item.publishedAt)
    .filter(value => !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return timestamps[0] ?? null;
}

export function buildAttestedMarketSentimentProjection(
  evidence: readonly SentimentProviderEvidence[],
  nowMs = Date.now(),
): AttestedMarketSentimentProjection {
  const normalizedEvidence = evidence.filter(item => item.evidenceRef.trim().length > 0);
  const attestations = normalizedEvidence.map(item => buildItemAttestation(item, nowMs));
  const scoreCandidates = attestations.filter(item => item.scoreCandidate);
  const completeCandidates = scoreCandidates.filter(item => item.complete);
  const researchItems = completeCandidates
    .map(toResearchItem)
    .filter((item): item is SentimentResearchItem => item !== null);

  const assessment = researchItems.length > 0 ? evaluateSentimentResearch(researchItems) : null;
  const missingFeatures = REQUIRED_SENTIMENT_FEATURES.filter(feature =>
    scoreCandidates.length === 0
      || scoreCandidates.some(item => item.features[feature].status !== 'ATTESTED'),
  );
  const invalidEvidenceRefs = attestations
    .filter(item =>
      item.ageStatus === 'INVALID'
      || REQUIRED_SENTIMENT_FEATURES.some(feature => item.features[feature].status === 'INVALID'),
    )
    .map(item => item.evidenceRef);

  const score = assessment?.status === 'READY' && assessment.score !== null ? assessment.score : null;
  const ready = score !== null;
  const status: MarketSentimentProjectionStatus = normalizedEvidence.length === 0
    ? 'SOURCE_UNAVAILABLE'
    : ready
      ? 'READY'
      : 'NOT_COMPUTABLE';

  const evidenceIds = normalizedEvidenceRefs(normalizedEvidence.map(item => item.evidenceRef));
  const drivers = Object.freeze(normalizedEvidence.slice(0, 5).map(item => Object.freeze({
    title: item.source || item.provider,
    description: item.headline,
    direction: driverDirection(item.sentimentLabel),
  })));

  const summary = ready
    ? `${completeCandidates.length} vollständig attestierte Sentiment-Evidence-Beobachtung(en) wurden ausschließlich über ${CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION} ausgewertet. Headline-Heuristik bleibt von der Score-Berechnung getrennt.`
    : normalizedEvidence.length === 0
      ? 'Keine verifizierte Provider-Evidence verfügbar; es wird kein Ersatz- oder Neutral-Score erzeugt.'
      : scoreCandidates.length === 0
        ? 'Provider-Evidence ist vorhanden, aber kein Upstream-Adapter attestiert den vollständigen FINTECH-Sentiment-Feature-Vektor. Headline-Heuristik bleibt Präsentationsmetadatum und darf keinen Score erzeugen.'
        : `Sentiment-Evidence ist unvollständig: ${missingFeatures.join(', ') || 'ungültige Attestierung'}. Kein Defaultwert und kein synthetischer Score wird eingesetzt.`;

  return Object.freeze({
    projectionVersion: MARKET_SENTIMENT_PROJECTION_VERSION,
    contractVersion: SENTIMENT_FEATURE_CONTRACT_VERSION,
    category: 'KRYPTO' as const,
    status,
    score,
    label: ready ? 'Attestierter FINTECH Research-Score' : status === 'SOURCE_UNAVAILABLE' ? 'Evidence nicht verfügbar' : 'Evidence vorhanden · Score nicht berechenbar',
    summary,
    history30d: Object.freeze([]) as readonly [],
    drivers,
    modelVersion: CRYPTO_SENTIMENT_RESEARCH_MODEL_VERSION,
    evidenceIds,
    observedAt: latestObservedAt(normalizedEvidence),
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_CONTEXT_ONLY' as const,
    attestation: Object.freeze({
      evidenceCount: normalizedEvidence.length,
      scoreCandidateCount: scoreCandidates.length,
      completeCandidateCount: completeCandidates.length,
      missingFeatures: Object.freeze(missingFeatures),
      invalidEvidenceRefs: Object.freeze([...new Set(invalidEvidenceRefs)].sort()),
      items: Object.freeze(attestations),
    }),
  });
}
