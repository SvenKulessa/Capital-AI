import { buildEffectiveScoringFingerprintMetadata } from './scoringFingerprint';
import {
  CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION,
  CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION,
} from './CryptoResearchModelContracts';

export const CRYPTO_CATEGORY_RESEARCH_SCORING_VERSION = 'crypto-category-research-scoring/0.1.0' as const;
export const CRYPTO_DEFI_RESEARCH_WEIGHTS_VERSION = 'crypto-defi-research-weights/0.1.0' as const;
export const CRYPTO_MEME_RESEARCH_WEIGHTS_VERSION = 'crypto-meme-research-weights/0.1.0' as const;
export const CRYPTO_CATEGORY_RESEARCH_EVIDENCE_CONTRACT_VERSION = 'crypto-category-research-evidence/0.1.0' as const;

export type CryptoCategoryResearchStatus = 'READY' | 'RESTRICTED' | 'BLOCKED' | 'NOT_COMPUTABLE';
export type CryptoCategoryResearchModelId = 'crypto-defi-fundamental' | 'crypto-meme-integrity';

export interface CryptoCategoryResearchLineage {
  readonly effectiveFeatureFingerprint: string;
  readonly effectiveWeightFingerprint: string;
  readonly effectiveWeights: Readonly<Record<string, number>>;
  readonly nominalWeightsVersion: string;
  readonly evidenceContractVersion: string;
}

export interface CryptoCategoryResearchAssessment {
  readonly scoringVersion: typeof CRYPTO_CATEGORY_RESEARCH_SCORING_VERSION;
  readonly modelId: CryptoCategoryResearchModelId;
  readonly modelVersion: '0.3.0';
  readonly status: CryptoCategoryResearchStatus;
  readonly researchCompositeScore: number | null;
  readonly confidenceAdjustedScore: number | null;
  readonly riskScore: number | null;
  readonly riskAdjustedScore: number | null;
  readonly confidence: number;
  readonly factors: Readonly<Record<string, number>>;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly missingFields: readonly string[];
  readonly lineage: CryptoCategoryResearchLineage | null;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_ONLY_SCORING_DISPATCHER_PROMOTION_REQUIRED';
}

export interface DefiResearchScoringInput {
  readonly confidence: number;
  readonly riskPenaltyWeight?: number;
  readonly utilization: {
    readonly activeUsers30d: number;
    readonly transactionCount30d: number;
    readonly organicVolume30d: number;
    readonly tvlStability90d: number;
    readonly retention30d: number;
    readonly developerActivity: number;
  };
  readonly fundamentals: {
    readonly protocolFees30d: number;
    readonly protocolRevenue30d: number;
    readonly feeGrowth30d: number;
    readonly revenueDiversification: number;
  };
  readonly liquidity: {
    readonly poolDepth100k: number;
    readonly volumeToLiquidityRatio: number;
    readonly slippage100kQuality: number;
    readonly liquidityPersistence30d: number;
    readonly marketCount: number;
    readonly liquidityDiversification: number;
  };
  readonly contractSecurity: {
    readonly verifiedSource: number;
    readonly multipleAudits: number;
    readonly formalVerification: number;
    readonly immutableCore: number;
    readonly timelockedAdmin: number;
    readonly multisigSecurity: number;
    readonly noUnresolvedExploit: number;
    readonly constrainedUpgradeability: number;
    readonly lowDependencyRisk: number;
    readonly emergencyPauseDesign: number;
  };
  readonly oracle: {
    readonly sourceDiversity: number;
    readonly marketDepth: number;
    readonly updateLiveness: number;
    readonly deviationProtection: number;
    readonly manipulationResistance: number;
    readonly fallbackQuality: number;
  };
  readonly tokenomics: {
    readonly lowUnlockPressure90d: number;
    readonly circulatingSupplyQuality: number;
    readonly valueAccrual: number;
    readonly lowHolderConcentration: number;
    readonly treasuryRunway: number;
    readonly stakingSustainability: number;
  };
  readonly governance: number;
  readonly ecosystem: number;
  readonly risks: {
    readonly contract: number;
    readonly liquidity: number;
    readonly oracle: number;
    readonly governance: number;
    readonly fundamentals: number;
    readonly tokenomics: number;
    readonly bridge: number;
  };
  readonly hardGates: {
    readonly smartContractEvidenceVerified: boolean;
    readonly oracleRiskWithinPolicy: boolean;
    readonly unknownAdminCanMint: boolean;
    readonly unrestrictedPauseFunction: boolean;
    readonly upgradeAuthoritySingleWallet: boolean;
    readonly exploitUnresolved: boolean;
  };
}

export interface MemeResearchScoringInput {
  readonly confidence: number;
  readonly riskPenaltyWeight?: number;
  readonly liquidity: {
    readonly liquidityUsdQuality: number;
    readonly slippage25kQuality: number;
    readonly volumeConsistency7d: number;
    readonly spreadQuality: number;
    readonly liquidityLockQuality: number;
  };
  readonly marketStructure: {
    readonly return1hQuality: number;
    readonly return24hQuality: number;
    readonly volumeAcceleration: number;
    readonly relativeStrengthVsSector: number;
    readonly breakoutQuality: number;
    readonly fundingQuality: number;
  };
  readonly social: {
    readonly uniqueAuthors: number;
    readonly engagementQuality: number;
    readonly mentionVelocity: number;
    readonly sentimentConsensus: number;
    readonly influencerDiversity: number;
    readonly botResistance: number;
    readonly marketConfirmations: number;
  };
  readonly narrative: number;
  readonly exchangeAccess: number;
  readonly holderRisk: {
    readonly top10HolderShare: number;
    readonly top50HolderShare: number;
    readonly teamWalletShare: number;
    readonly exchangeConcentration: number;
    readonly sniperWalletShare: number;
    readonly dormantWhaleSupply: number;
  };
  readonly rugRisk: {
    readonly mintAuthority: number;
    readonly blacklistAuthority: number;
    readonly taxChangeAuthority: number;
    readonly liquidityUnlockRisk: number;
    readonly proxyUpgradeRisk: number;
    readonly deployerConcentration: number;
    readonly honeypotSimulationRisk: number;
  };
  readonly tokenomicsRisk: number;
  readonly regulatoryRisk: number;
  readonly marketRisk: number;
  readonly hardGates: {
    readonly buySimulationSuccess: boolean;
    readonly sellSimulationSuccess: boolean;
    readonly liquidityLockWithinPolicy: boolean;
    readonly transferTaxWithinPolicy: boolean;
    readonly contractIntegrityVerified: boolean;
    readonly manipulationEvidenceWithinPolicy: boolean;
  };
}

const DEFI_WEIGHTS = Object.freeze({
  fundamentals: 0.20,
  utilization: 0.18,
  liquidity: 0.17,
  contractSecurity: 0.15,
  governance: 0.12,
  tokenomics: 0.10,
  ecosystem: 0.08,
} as const);

const DEFI_RISK_WEIGHTS = Object.freeze({
  contract: 0.22,
  liquidity: 0.16,
  oracle: 0.15,
  governance: 0.12,
  fundamentals: 0.15,
  tokenomics: 0.10,
  bridge: 0.10,
} as const);

const MEME_WEIGHTS = Object.freeze({
  liquidity: 0.25,
  marketStructure: 0.20,
  sentiment: 0.18,
  narrative: 0.15,
  distribution: 0.12,
  exchangeAccess: 0.10,
} as const);

const MEME_RISK_WEIGHTS = Object.freeze({
  liquidity: 0.25,
  concentration: 0.18,
  contract: 0.18,
  market: 0.17,
  sentiment: 0.12,
  tokenomics: 0.07,
  regulatory: 0.03,
} as const);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toScore(value: number): number {
  return Number((clamp01(value) * 100).toFixed(2));
}

function weighted(values: Readonly<Record<string, number>>, weights: Readonly<Record<string, number>>): number {
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + values[key] * weight, 0);
}

function collectInvalidNormalized(prefix: string, value: unknown, errors: string[]): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(prefix);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectInvalidNormalized(`${prefix}.${key}`, child, errors);
    }
  }
}

function validateCommon(input: { confidence: number; riskPenaltyWeight?: number }): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) errors.push('confidence');
  if (input.riskPenaltyWeight !== undefined
    && (!Number.isFinite(input.riskPenaltyWeight) || input.riskPenaltyWeight < 0 || input.riskPenaltyWeight > 1)) {
    errors.push('riskPenaltyWeight');
  }
  return errors;
}

function makeLineage(
  modelId: CryptoCategoryResearchModelId,
  featureContractVersion: string,
  nominalWeightsVersion: string,
  factors: Readonly<Record<string, number>>,
  weights: Readonly<Record<string, number>>,
): CryptoCategoryResearchLineage {
  const metadata = buildEffectiveScoringFingerprintMetadata({
    modelVersion: `${modelId}/0.3.0`,
    featureContractVersion,
    nominalWeightsVersion,
    evidenceContractVersion: CRYPTO_CATEGORY_RESEARCH_EVIDENCE_CONTRACT_VERSION,
    values: factors,
    nominalWeights: weights,
  });
  return Object.freeze({
    effectiveFeatureFingerprint: metadata.effectiveFeatureFingerprint,
    effectiveWeightFingerprint: metadata.effectiveWeightFingerprint,
    effectiveWeights: metadata.effectiveWeights,
    nominalWeightsVersion: metadata.nominalWeightsVersion,
    evidenceContractVersion: metadata.evidenceContractVersion,
  });
}

function assessment(input: Omit<CryptoCategoryResearchAssessment,
  'scoringVersion' | 'modelVersion' | 'scoreEligible' | 'executionEligible' | 'authority'>): CryptoCategoryResearchAssessment {
  return Object.freeze({
    scoringVersion: CRYPTO_CATEGORY_RESEARCH_SCORING_VERSION,
    modelVersion: '0.3.0' as const,
    ...input,
    scoreEligible: false as const,
    executionEligible: false as const,
    authority: 'RESEARCH_ONLY_SCORING_DISPATCHER_PROMOTION_REQUIRED' as const,
  });
}

export function evaluateDefiResearchScore(input: DefiResearchScoringInput): CryptoCategoryResearchAssessment {
  const invalid = validateCommon(input);
  collectInvalidNormalized('utilization', input.utilization, invalid);
  collectInvalidNormalized('fundamentals', input.fundamentals, invalid);
  collectInvalidNormalized('liquidity', input.liquidity, invalid);
  collectInvalidNormalized('contractSecurity', input.contractSecurity, invalid);
  collectInvalidNormalized('oracle', input.oracle, invalid);
  collectInvalidNormalized('tokenomics', input.tokenomics, invalid);
  collectInvalidNormalized('governance', input.governance, invalid);
  collectInvalidNormalized('ecosystem', input.ecosystem, invalid);
  collectInvalidNormalized('risks', input.risks, invalid);

  if (invalid.length > 0) {
    return assessment({
      modelId: 'crypto-defi-fundamental',
      status: 'NOT_COMPUTABLE',
      researchCompositeScore: null,
      confidenceAdjustedScore: null,
      riskScore: null,
      riskAdjustedScore: null,
      confidence: Number.isFinite(input.confidence) ? clamp01(input.confidence) : 0,
      factors: Object.freeze({}),
      blockers: Object.freeze([]),
      warnings: Object.freeze(['All normalized DeFi inputs must be finite within 0..1.']),
      missingFields: Object.freeze([...new Set(invalid)].sort()),
      lineage: null,
    });
  }

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.hardGates.smartContractEvidenceVerified) blockers.push('SMART_CONTRACT_EVIDENCE_NOT_VERIFIED');
  if (!input.hardGates.oracleRiskWithinPolicy) blockers.push('ORACLE_RISK_OUTSIDE_POLICY');
  if (input.hardGates.unknownAdminCanMint) blockers.push('UNKNOWN_ADMIN_CAN_MINT');
  if (input.hardGates.exploitUnresolved) blockers.push('UNRESOLVED_EXPLOIT');
  if (input.hardGates.unrestrictedPauseFunction) warnings.push('UNRESTRICTED_PAUSE_FUNCTION');
  if (input.hardGates.upgradeAuthoritySingleWallet) warnings.push('SINGLE_WALLET_UPGRADE_AUTHORITY');

  const utilization = weighted(input.utilization, {
    activeUsers30d: 0.25,
    transactionCount30d: 0.20,
    organicVolume30d: 0.20,
    tvlStability90d: 0.15,
    retention30d: 0.10,
    developerActivity: 0.10,
  });
  const fundamentals = weighted(input.fundamentals, {
    protocolFees30d: 0.35,
    protocolRevenue30d: 0.25,
    feeGrowth30d: 0.20,
    revenueDiversification: 0.20,
  });
  const liquidity = weighted(input.liquidity, {
    poolDepth100k: 0.25,
    volumeToLiquidityRatio: 0.20,
    slippage100kQuality: 0.20,
    liquidityPersistence30d: 0.15,
    marketCount: 0.10,
    liquidityDiversification: 0.10,
  });
  const contractSecurity = weighted(input.contractSecurity, {
    verifiedSource: 0.05,
    multipleAudits: 0.10,
    formalVerification: 0.10,
    immutableCore: 0.10,
    timelockedAdmin: 0.10,
    multisigSecurity: 0.10,
    noUnresolvedExploit: 0.20,
    constrainedUpgradeability: 0.10,
    lowDependencyRisk: 0.10,
    emergencyPauseDesign: 0.05,
  });
  const oracle = weighted(input.oracle, {
    sourceDiversity: 0.20,
    marketDepth: 0.20,
    updateLiveness: 0.15,
    deviationProtection: 0.15,
    manipulationResistance: 0.15,
    fallbackQuality: 0.15,
  });
  const tokenomics = weighted(input.tokenomics, {
    lowUnlockPressure90d: 0.20,
    circulatingSupplyQuality: 0.20,
    valueAccrual: 0.15,
    lowHolderConcentration: 0.15,
    treasuryRunway: 0.15,
    stakingSustainability: 0.15,
  });

  const factors = Object.freeze({
    fundamentals,
    utilization,
    liquidity,
    contractSecurity,
    governance: input.governance,
    tokenomics,
    ecosystem: input.ecosystem,
    oracle,
  });
  const baseFactors = {
    fundamentals,
    utilization,
    liquidity,
    contractSecurity,
    governance: input.governance,
    tokenomics,
    ecosystem: input.ecosystem,
  };
  const researchCompositeScore = toScore(weighted(baseFactors, DEFI_WEIGHTS));
  const riskScore = toScore(weighted(input.risks, DEFI_RISK_WEIGHTS));
  const confidenceAdjustedScore = Number((researchCompositeScore * input.confidence).toFixed(2));
  const riskAdjustedScore = input.riskPenaltyWeight === undefined
    ? null
    : Number(Math.max(0, confidenceAdjustedScore - (riskScore * input.riskPenaltyWeight)).toFixed(2));
  if (input.riskPenaltyWeight === undefined) {
    warnings.push('RISK_PENALTY_WEIGHT_NOT_GOVERNED: riskAdjustedScore intentionally remains null.');
  }

  const status: CryptoCategoryResearchStatus = blockers.length > 0
    ? 'BLOCKED'
    : input.hardGates.unrestrictedPauseFunction
      ? 'RESTRICTED'
      : 'READY';

  return assessment({
    modelId: 'crypto-defi-fundamental',
    status,
    researchCompositeScore,
    confidenceAdjustedScore,
    riskScore,
    riskAdjustedScore,
    confidence: input.confidence,
    factors,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    missingFields: Object.freeze([]),
    lineage: makeLineage(
      'crypto-defi-fundamental',
      CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION,
      CRYPTO_DEFI_RESEARCH_WEIGHTS_VERSION,
      baseFactors,
      DEFI_WEIGHTS,
    ),
  });
}

export function evaluateMemeResearchScore(input: MemeResearchScoringInput): CryptoCategoryResearchAssessment {
  const invalid = validateCommon(input);
  collectInvalidNormalized('liquidity', input.liquidity, invalid);
  collectInvalidNormalized('marketStructure', input.marketStructure, invalid);
  collectInvalidNormalized('social.uniqueAuthors', input.social.uniqueAuthors, invalid);
  collectInvalidNormalized('social.engagementQuality', input.social.engagementQuality, invalid);
  collectInvalidNormalized('social.mentionVelocity', input.social.mentionVelocity, invalid);
  collectInvalidNormalized('social.sentimentConsensus', input.social.sentimentConsensus, invalid);
  collectInvalidNormalized('social.influencerDiversity', input.social.influencerDiversity, invalid);
  collectInvalidNormalized('social.botResistance', input.social.botResistance, invalid);
  if (!Number.isInteger(input.social.marketConfirmations) || input.social.marketConfirmations < 0) {
    invalid.push('social.marketConfirmations');
  }
  collectInvalidNormalized('narrative', input.narrative, invalid);
  collectInvalidNormalized('exchangeAccess', input.exchangeAccess, invalid);
  collectInvalidNormalized('holderRisk', input.holderRisk, invalid);
  collectInvalidNormalized('rugRisk', input.rugRisk, invalid);
  collectInvalidNormalized('tokenomicsRisk', input.tokenomicsRisk, invalid);
  collectInvalidNormalized('regulatoryRisk', input.regulatoryRisk, invalid);
  collectInvalidNormalized('marketRisk', input.marketRisk, invalid);

  if (invalid.length > 0) {
    return assessment({
      modelId: 'crypto-meme-integrity',
      status: 'NOT_COMPUTABLE',
      researchCompositeScore: null,
      confidenceAdjustedScore: null,
      riskScore: null,
      riskAdjustedScore: null,
      confidence: Number.isFinite(input.confidence) ? clamp01(input.confidence) : 0,
      factors: Object.freeze({}),
      blockers: Object.freeze([]),
      warnings: Object.freeze(['All normalized Meme inputs must be finite within 0..1 and marketConfirmations must be a non-negative integer.']),
      missingFields: Object.freeze([...new Set(invalid)].sort()),
      lineage: null,
    });
  }

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.hardGates.buySimulationSuccess) blockers.push('BUY_HONEYPOT');
  if (!input.hardGates.sellSimulationSuccess) blockers.push('SELL_HONEYPOT');
  if (!input.hardGates.liquidityLockWithinPolicy) blockers.push('LIQUIDITY_UNLOCK_RISK');
  if (!input.hardGates.transferTaxWithinPolicy) blockers.push('EXCESSIVE_TRANSFER_TAX');
  if (!input.hardGates.contractIntegrityVerified) blockers.push('CONTRACT_INTEGRITY_NOT_VERIFIED');
  if (!input.hardGates.manipulationEvidenceWithinPolicy) blockers.push('MANIPULATION_EVIDENCE_OUTSIDE_POLICY');
  if (input.social.marketConfirmations < 2) {
    return assessment({
      modelId: 'crypto-meme-integrity',
      status: blockers.length > 0 ? 'BLOCKED' : 'NOT_COMPUTABLE',
      researchCompositeScore: null,
      confidenceAdjustedScore: null,
      riskScore: null,
      riskAdjustedScore: null,
      confidence: input.confidence,
      factors: Object.freeze({}),
      blockers: Object.freeze(blockers),
      warnings: Object.freeze(['SOCIAL_SIGNAL_REQUIRES_TWO_MARKET_CONFIRMATIONS']),
      missingFields: Object.freeze(['social.marketConfirmations>=2']),
      lineage: null,
    });
  }

  const liquidity = weighted(input.liquidity, {
    liquidityUsdQuality: 0.30,
    slippage25kQuality: 0.25,
    volumeConsistency7d: 0.20,
    spreadQuality: 0.15,
    liquidityLockQuality: 0.10,
  });
  const marketStructure = weighted(input.marketStructure, {
    return1hQuality: 0.25,
    return24hQuality: 0.20,
    volumeAcceleration: 0.20,
    relativeStrengthVsSector: 0.15,
    breakoutQuality: 0.10,
    fundingQuality: 0.10,
  });
  const sentiment = weighted({
    uniqueAuthors: input.social.uniqueAuthors,
    engagementQuality: input.social.engagementQuality,
    mentionVelocity: input.social.mentionVelocity,
    sentimentConsensus: input.social.sentimentConsensus,
    influencerDiversity: input.social.influencerDiversity,
    botResistance: input.social.botResistance,
  }, {
    uniqueAuthors: 0.25,
    engagementQuality: 0.20,
    mentionVelocity: 0.20,
    sentimentConsensus: 0.15,
    influencerDiversity: 0.10,
    botResistance: 0.10,
  });
  const holderRisk = weighted(input.holderRisk, {
    top10HolderShare: 0.30,
    top50HolderShare: 0.20,
    teamWalletShare: 0.15,
    exchangeConcentration: 0.15,
    sniperWalletShare: 0.10,
    dormantWhaleSupply: 0.10,
  });
  const distribution = 1 - holderRisk;
  const rugRisk = weighted(input.rugRisk, {
    mintAuthority: 0.20,
    blacklistAuthority: 0.15,
    taxChangeAuthority: 0.15,
    liquidityUnlockRisk: 0.15,
    proxyUpgradeRisk: 0.15,
    deployerConcentration: 0.10,
    honeypotSimulationRisk: 0.10,
  });

  const baseFactors = {
    liquidity,
    marketStructure,
    sentiment,
    narrative: input.narrative,
    distribution,
    exchangeAccess: input.exchangeAccess,
  };
  const risks = {
    liquidity: 1 - liquidity,
    concentration: holderRisk,
    contract: rugRisk,
    market: input.marketRisk,
    sentiment: 1 - sentiment,
    tokenomics: input.tokenomicsRisk,
    regulatory: input.regulatoryRisk,
  };
  const factors = Object.freeze({ ...baseFactors, holderRisk, rugRisk });
  const researchCompositeScore = toScore(weighted(baseFactors, MEME_WEIGHTS));
  const riskScore = toScore(weighted(risks, MEME_RISK_WEIGHTS));
  const confidenceAdjustedScore = Number((researchCompositeScore * input.confidence).toFixed(2));
  const riskAdjustedScore = input.riskPenaltyWeight === undefined
    ? null
    : Number(Math.max(0, confidenceAdjustedScore - (riskScore * input.riskPenaltyWeight)).toFixed(2));
  if (input.riskPenaltyWeight === undefined) {
    warnings.push('RISK_PENALTY_WEIGHT_NOT_GOVERNED: riskAdjustedScore intentionally remains null.');
  }

  return assessment({
    modelId: 'crypto-meme-integrity',
    status: blockers.length > 0 ? 'BLOCKED' : 'READY',
    researchCompositeScore,
    confidenceAdjustedScore,
    riskScore,
    riskAdjustedScore,
    confidence: input.confidence,
    factors,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    missingFields: Object.freeze([]),
    lineage: makeLineage(
      'crypto-meme-integrity',
      CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION,
      CRYPTO_MEME_RESEARCH_WEIGHTS_VERSION,
      baseFactors,
      MEME_WEIGHTS,
    ),
  });
}
