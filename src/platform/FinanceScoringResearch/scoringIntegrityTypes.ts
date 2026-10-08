export type ScoringAvailabilityStatus =
  | 'READY'
  | 'DATA_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'INSUFFICIENT_HISTORY'
  | 'STALE_DATA'
  | 'SCORE_NOT_COMPUTABLE';

export type DataQualityLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface ScoringEvidenceRef {
  id: string;
  source: string;
  observedAt: string;
  retrievedAt: string;
  kind: 'market-history' | 'market-snapshot' | 'fundamental' | 'user-input';
}

export interface EffectiveFeatureIntegrity {
  readonly key: string;
  readonly status: 'PRESENT' | 'MISSING';
  readonly inverted: boolean;
}

export interface ScoringIntegrityMetadata {
  status: ScoringAvailabilityStatus;
  assetId: string;
  providers: string[];
  observedAt?: string;
  retrievedAt: string;
  dataQuality: DataQualityLevel;
  featureVersion: string;
  scoringVersion: string;
  coverage: number;
  evidence: ScoringEvidenceRef[];
  missingFields: string[];
  reason?: string;
  /** SC-2 C3 traceability: canonical model-execution authority. */
  dispatcherVersion?: string;
  modelRegistryVersion?: string;
  modelId?: string;
  modelVersion?: string;
  modelAlias?: string;
  modelLifecycle?: string;
  executorKey?: string;
  resultContractVersion?: string;
  /**
   * scoring-integrity/1.1.0 effective-execution lineage. Optional at the TypeScript migration
   * boundary so legacy 1.0.0 model adapters remain compatible; mandatory for models declaring
   * resultContractVersion=scoring-integrity/1.1.0.
   */
  effectiveFeatureFingerprint?: string;
  effectiveWeightFingerprint?: string;
  effectiveFeatures?: readonly EffectiveFeatureIntegrity[];
  effectiveWeights?: Readonly<Record<string, number>>;
  nominalWeightsVersion?: string;
  evidenceContractVersion?: string;
}

export interface UnavailableScoreResult {
  status: Exclude<ScoringAvailabilityStatus, 'READY'>;
  score: null;
  final_score: null;
  integrity: ScoringIntegrityMetadata;
}

export interface ReadyScoreResult {
  status: 'READY';
  score: number;
  final_score: number;
  integrity: ScoringIntegrityMetadata;
}

export type CanonicalScoreResult = ReadyScoreResult | UnavailableScoreResult;