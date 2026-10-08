import { createHash } from 'node:crypto';

export const EFFECTIVE_SCORING_FINGERPRINT_VERSION = 'effective-scoring-fingerprint/1.0.0' as const;

export type EffectiveFeaturePresence = 'PRESENT' | 'MISSING';

export interface EffectiveFeatureDescriptor {
  readonly key: string;
  readonly status: EffectiveFeaturePresence;
  readonly inverted: boolean;
}

export interface EffectiveScoringFingerprintInput {
  readonly modelVersion: string;
  readonly featureContractVersion: string;
  readonly nominalWeightsVersion: string;
  readonly evidenceContractVersion: string;
  readonly values: Readonly<Record<string, number | null | undefined>>;
  readonly nominalWeights: Readonly<Record<string, number>>;
  readonly invertedFields?: ReadonlySet<string>;
}

export interface EffectiveScoringFingerprintMetadata {
  readonly effectiveFeatureFingerprint: string;
  readonly effectiveWeightFingerprint: string;
  readonly effectiveFeatures: readonly EffectiveFeatureDescriptor[];
  readonly effectiveWeights: Readonly<Record<string, number>>;
  readonly nominalWeightsVersion: string;
  readonly evidenceContractVersion: string;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Deterministic lineage for the weights that were actually eligible for one model evaluation.
 * Missing features remain in the canonical representation with zero effective weight; this makes
 * dynamic renormalization replayable and prevents nominal/effective-weight drift from being hidden.
 *
 * The fingerprints bind the governing contract versions, not only the observed numeric shape. A
 * replay therefore cannot silently reuse the same fingerprint after an evidence or weight-contract
 * revision whose current values happen to remain numerically identical.
 */
export function buildEffectiveScoringFingerprintMetadata(
  input: EffectiveScoringFingerprintInput,
): EffectiveScoringFingerprintMetadata {
  const keys = Object.keys(input.nominalWeights).sort((a, b) => a.localeCompare(b));
  const invertedFields = input.invertedFields ?? new Set<string>();
  const effectiveFeatures: EffectiveFeatureDescriptor[] = keys.map((key) => ({
    key,
    status: finite(input.values[key]) ? 'PRESENT' : 'MISSING',
    inverted: invertedFields.has(key),
  }));

  const presentNominalWeight = keys.reduce((sum, key) => (
    finite(input.values[key]) ? sum + input.nominalWeights[key] : sum
  ), 0);

  const effectiveWeights = Object.fromEntries(keys.map((key) => {
    const normalized = finite(input.values[key]) && presentNominalWeight > 0
      ? input.nominalWeights[key] / presentNominalWeight
      : 0;
    return [key, Number(normalized.toFixed(12))];
  }));

  const featureCanonical = {
    fingerprintVersion: EFFECTIVE_SCORING_FINGERPRINT_VERSION,
    modelVersion: input.modelVersion,
    featureContractVersion: input.featureContractVersion,
    evidenceContractVersion: input.evidenceContractVersion,
    features: effectiveFeatures,
  };
  const weightCanonical = {
    fingerprintVersion: EFFECTIVE_SCORING_FINGERPRINT_VERSION,
    modelVersion: input.modelVersion,
    featureContractVersion: input.featureContractVersion,
    nominalWeightsVersion: input.nominalWeightsVersion,
    evidenceContractVersion: input.evidenceContractVersion,
    features: effectiveFeatures.map((feature) => ({
      ...feature,
      effectiveWeight: effectiveWeights[feature.key],
    })),
  };

  return Object.freeze({
    effectiveFeatureFingerprint: sha256(featureCanonical),
    effectiveWeightFingerprint: sha256(weightCanonical),
    effectiveFeatures: Object.freeze(effectiveFeatures.map((feature) => Object.freeze(feature))),
    effectiveWeights: Object.freeze(effectiveWeights),
    nominalWeightsVersion: input.nominalWeightsVersion,
    evidenceContractVersion: input.evidenceContractVersion,
  });
}
