export const CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION =
  'crypto-meme-research-features/0.3.0' as const;
export const CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION =
  'crypto-defi-research-features/0.3.0' as const;

export type CryptoResearchModelId = 'crypto-meme-integrity' | 'crypto-defi-fundamental';
export type CryptoResearchFeatureRole = 'RAW_EVIDENCE' | 'HARD_GATE';

export interface CryptoResearchFeatureBinding {
  readonly key: string;
  readonly source: string;
  readonly latentFactor: string;
  readonly correlationGroup: string;
  readonly role: CryptoResearchFeatureRole;
  readonly requiredForResearch: boolean;
}

export interface CryptoResearchModelContract {
  readonly modelId: CryptoResearchModelId;
  readonly modelVersion: '0.3.0';
  readonly featureContractVersion:
    | typeof CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION
    | typeof CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION;
  readonly lifecycle: 'challenger';
  readonly scoreEligible: false;
  readonly executableWeights: false;
  readonly features: readonly CryptoResearchFeatureBinding[];
  readonly antiCorrelationRules: readonly string[];
  readonly promotionRequirements: readonly string[];
}

const feature = (
  key: string,
  source: string,
  latentFactor: string,
  correlationGroup: string,
  role: CryptoResearchFeatureRole = 'RAW_EVIDENCE',
  requiredForResearch = true,
): CryptoResearchFeatureBinding => Object.freeze({
  key,
  source,
  latentFactor,
  correlationGroup,
  role,
  requiredForResearch,
});

/**
 * Owner-source-backed Meme research contract. The source-defined model is now implemented as a
 * deterministic research evaluator, but this registry contract deliberately remains non-executable:
 * productive promotion still requires verified provider coverage, backtesting and an explicit
 * ScoringModelRegistry/ScoringDispatcher decision. The old 35/25/20/20 service remains legacy.
 */
export const CRYPTO_MEME_RESEARCH_MODEL_CONTRACT: CryptoResearchModelContract = Object.freeze({
  modelId: 'crypto-meme-integrity',
  modelVersion: '0.3.0',
  featureContractVersion: CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('liquidity.liquidityUsdQuality', 'governed-market-liquidity-evidence', 'executionLiquidity', 'meme-execution-liquidity'),
    feature('liquidity.slippage25kQuality', 'governed-orderbook-simulation-evidence', 'executionLiquidity', 'meme-execution-liquidity'),
    feature('liquidity.volumeConsistency7d', 'governed-market-history-evidence', 'executionLiquidity', 'meme-execution-liquidity'),
    feature('liquidity.spreadQuality', 'governed-orderbook-evidence', 'executionLiquidity', 'meme-execution-liquidity'),
    feature('liquidity.liquidityLockQuality', 'governed-onchain-evidence', 'executionLiquidity', 'meme-execution-liquidity'),

    feature('market.return1hQuality', 'governed-market-history-evidence', 'marketStructure', 'meme-market-structure'),
    feature('market.return24hQuality', 'governed-market-history-evidence', 'marketStructure', 'meme-market-structure'),
    feature('market.volumeAcceleration', 'governed-market-history-evidence', 'marketStructure', 'meme-market-structure'),
    feature('market.relativeStrengthVsSector', 'governed-market-history-evidence', 'marketStructure', 'meme-market-structure'),
    feature('market.breakoutQuality', 'fintech-core.crypto/pattern-research-engine', 'marketStructure', 'meme-market-structure'),
    feature('market.fundingQuality', 'governed-derivatives-evidence', 'marketStructure', 'meme-market-structure'),

    feature('distribution.top10HolderShare', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),
    feature('distribution.top50HolderShare', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),
    feature('distribution.teamWalletShare', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),
    feature('distribution.exchangeConcentration', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),
    feature('distribution.sniperWalletShare', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),
    feature('distribution.dormantWhaleSupply', 'governed-onchain-holder-evidence', 'holderDistribution', 'meme-holder-distribution'),

    feature('risk.mintAuthorityRisk', 'governed-contract-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.blacklistAuthorityRisk', 'governed-contract-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.taxChangeAuthorityRisk', 'governed-contract-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.liquidityUnlockRisk', 'governed-onchain-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.proxyUpgradeRisk', 'governed-contract-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.deployerConcentration', 'governed-onchain-holder-evidence', 'contractRugRisk', 'meme-contract-risk'),
    feature('risk.honeypotSimulationRisk', 'governed-transaction-simulation-evidence', 'contractRugRisk', 'meme-contract-risk'),

    feature('social.uniqueAuthors', 'governed-social-evidence', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.engagementQuality', 'governed-social-evidence', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.mentionVelocity', 'governed-social-evidence', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.sentimentConsensus', 'crypto-sentiment-research', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.influencerDiversity', 'governed-social-evidence', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.botResistance', 'governed-social-evidence', 'socialAuthenticity', 'meme-social-authenticity'),
    feature('social.marketConfirmations', 'governed-market-evidence', 'socialAuthenticity', 'meme-social-confirmation'),
    feature('narrative.strength', 'governed-narrative-evidence', 'narrativeStrength', 'meme-narrative'),
    feature('venue.exchangeAccess', 'governed-venue-evidence', 'exchangeAccess', 'meme-exchange-access'),

    feature('risk.buySimulationSuccess', 'governed-transaction-simulation-evidence', 'contractIntegrity', 'meme-contract-gates', 'HARD_GATE'),
    feature('risk.sellSimulationSuccess', 'governed-transaction-simulation-evidence', 'contractIntegrity', 'meme-contract-gates', 'HARD_GATE'),
    feature('risk.liquidityLockWithinPolicy', 'governed-onchain-evidence', 'contractIntegrity', 'meme-contract-gates', 'HARD_GATE'),
    feature('risk.transferTaxWithinPolicy', 'governed-contract-evidence', 'contractIntegrity', 'meme-contract-gates', 'HARD_GATE'),
    feature('risk.contractIntegrityVerified', 'governed-contract-evidence', 'contractIntegrity', 'meme-contract-gates', 'HARD_GATE'),
    feature('risk.manipulationEvidenceWithinPolicy', 'governed-market-integrity-evidence', 'marketIntegrity', 'meme-manipulation-gate', 'HARD_GATE'),
  ]),
  antiCorrelationRules: Object.freeze([
    'Liquidity, volume, spread and slippage describe overlapping execution capacity; subfeatures are composed once inside the execution-liquidity factor and MUST NOT be independently re-added at the top level.',
    'Short-horizon returns, momentum, breakout quality, volume acceleration and relative strength are price-path/market-structure observations; downstream signal fusion MUST NOT duplicate them in the Meme category score.',
    'Top-holder, team, exchange, sniper and dormant-whale observations are one holder-distribution risk family and MUST NOT be independently counted again as generic manipulation risk.',
    'Social sentiment, narrative and market confirmation require governed independent evidence; CryptoOrchestrator LLM/agent telemetry alone remains non-score evidence.',
    'Missing, stale or unverified contract/manipulation/honeypot evidence MUST remain NOT_COMPUTABLE/BLOCKED; never substitute 0, PASS or a neutral default.',
  ]),
  promotionRequirements: Object.freeze([
    'explicit Owner-approved model promotion through the existing ScoringModelRegistry/ScoringDispatcher',
    'validated contract, holder, order-book, derivatives, social and market-integrity evidence providers with freshness/DQ policy',
    'versioned executable weights with effective-feature and effective-weight fingerprints',
    'out-of-sample/backtest validation including manipulation, rug-pull, liquidity-shock and false-positive/false-negative analysis',
    'documented correlation/de-duplication analysis between category score, momentum, pattern, sentiment and regime research signals',
    'no parallel Meme dispatcher, registry, persistence authority or route-local canonical scorer',
  ]),
});

/**
 * Owner-source-backed DeFi research contract. Protocol activity, revenue, liquidity, security,
 * oracle, tokenomics, governance and ecosystem evidence are now inventoried explicitly. DeFiLlama
 * remains evidence-only and TVL/fees/revenue stay correlation-bound rather than becoming three
 * independent top-level weights.
 */
export const CRYPTO_DEFI_RESEARCH_MODEL_CONTRACT: CryptoResearchModelContract = Object.freeze({
  modelId: 'crypto-defi-fundamental',
  modelVersion: '0.3.0',
  featureContractVersion: CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION,
  lifecycle: 'challenger',
  scoreEligible: false,
  executableWeights: false,
  features: Object.freeze([
    feature('protocol.activeUsers30d', 'governed-protocol-usage-evidence', 'utilization', 'defi-utilization'),
    feature('protocol.transactionCount30d', 'governed-protocol-usage-evidence', 'utilization', 'defi-utilization'),
    feature('protocol.organicVolume30d', 'governed-protocol-usage-evidence', 'utilization', 'defi-utilization'),
    feature('protocol.tvlStability90d', 'governed-protocol-evidence', 'utilization', 'defi-utilization'),
    feature('protocol.retention30d', 'governed-protocol-usage-evidence', 'utilization', 'defi-utilization'),
    feature('protocol.developerActivity', 'governed-development-evidence', 'utilization', 'defi-utilization'),

    feature('protocol.tvlUsd', 'defi-protocol-evidence/1.1.0', 'protocolScaleActivity', 'defi-scale-activity'),
    feature('protocol.feesUsd', 'defi-protocol-evidence/1.1.0', 'protocolScaleActivity', 'defi-scale-activity'),
    feature('protocol.revenueUsd', 'defi-protocol-evidence/1.1.0', 'protocolScaleActivity', 'defi-scale-activity'),
    feature('protocol.feeGrowth30d', 'governed-protocol-revenue-evidence', 'revenueQuality', 'defi-revenue-quality'),
    feature('protocol.revenueDiversification', 'governed-protocol-revenue-evidence', 'revenueQuality', 'defi-revenue-quality'),

    feature('liquidity.poolDepth100k', 'governed-pool-liquidity-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.volumeToLiquidityRatio', 'governed-pool-liquidity-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.slippage100kQuality', 'governed-pool-simulation-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.persistence30d', 'governed-pool-liquidity-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.marketCount', 'governed-pool-liquidity-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.diversification', 'governed-pool-liquidity-evidence', 'protocolLiquidity', 'defi-protocol-liquidity'),
    feature('liquidity.lpConcentration', 'governed-pool-liquidity-evidence', 'liquidityConcentration', 'defi-liquidity-concentration'),

    feature('security.verifiedSource', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.multipleAudits', 'governed-audit-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.formalVerification', 'governed-audit-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.immutableCore', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.timelockedAdmin', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.multisigSecurity', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.noUnresolvedExploit', 'governed-security-incident-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.constrainedUpgradeability', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.lowDependencyRisk', 'governed-dependency-evidence', 'smartContractSecurity', 'defi-contract-security'),
    feature('security.emergencyPauseDesign', 'governed-contract-evidence', 'smartContractSecurity', 'defi-contract-security'),

    feature('oracle.sourceDiversity', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),
    feature('oracle.marketDepth', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),
    feature('oracle.updateLiveness', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),
    feature('oracle.deviationProtection', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),
    feature('oracle.manipulationResistance', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),
    feature('oracle.fallbackQuality', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-integrity'),

    feature('tokenomics.lowUnlockPressure90d', 'governed-tokenomics-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('tokenomics.circulatingSupplyQuality', 'governed-tokenomics-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('tokenomics.valueAccrual', 'governed-tokenomics-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('tokenomics.lowHolderConcentration', 'governed-tokenomics-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('tokenomics.treasuryRunway', 'governed-treasury-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('tokenomics.stakingSustainability', 'governed-tokenomics-evidence', 'tokenEconomics', 'defi-token-economics'),
    feature('governance.quality', 'governed-governance-evidence', 'governanceQuality', 'defi-governance'),
    feature('ecosystem.quality', 'governed-ecosystem-evidence', 'ecosystemQuality', 'defi-ecosystem'),

    feature('risk.badDebtUsd', 'governed-lending-evidence', 'creditRisk', 'defi-credit-risk'),
    feature('risk.bridge', 'governed-bridge-evidence', 'bridgeRisk', 'defi-bridge-risk'),
    feature('protocol.smartContractEvidenceVerified', 'governed-contract-evidence', 'smartContractIntegrity', 'defi-contract-gates', 'HARD_GATE'),
    feature('risk.oracleRiskWithinPolicy', 'governed-oracle-evidence', 'oracleIntegrity', 'defi-oracle-gate', 'HARD_GATE'),
    feature('risk.unknownAdminCanMintAbsent', 'governed-contract-evidence', 'smartContractIntegrity', 'defi-contract-gates', 'HARD_GATE'),
    feature('risk.unresolvedExploitAbsent', 'governed-security-incident-evidence', 'smartContractIntegrity', 'defi-contract-gates', 'HARD_GATE'),
  ]),
  antiCorrelationRules: Object.freeze([
    'TVL, fees and revenue share protocol scale/activity exposure and MUST NOT receive independent additive top-level weights without a validated de-correlation or latent-factor transform.',
    'Pool depth, volume-to-liquidity, slippage, persistence, market count and concentration form one execution/liquidity family and MUST NOT be duplicated in generic market liquidity factors.',
    'Protocol usage and token price/market-cap evidence are separate economic objects; token performance MUST NOT proxy protocol utilization or security.',
    'Contract security, oracle integrity and bridge risk are separate risk families; an audit badge or high TVL MUST NOT neutralize a failed hard gate.',
    'DeFiLlama is an evidence provider only; provider availability, ranking or brand MUST NOT affect score weight or eligibility.',
    'STALE, NOT_AVAILABLE or INVALID evidence MUST NOT satisfy REQUIRED/HARD_GATE semantics and MUST never be converted to 0 or PASS.',
  ]),
  promotionRequirements: Object.freeze([
    'explicit Owner-approved model promotion through the existing ScoringModelRegistry/ScoringDispatcher',
    'validated category-specific DQ/freshness thresholds and protocol-to-token identity mapping',
    'verified provider coverage for utilization, liquidity, security, oracle, tokenomics, governance, ecosystem, lending and bridge evidence',
    'versioned executable weights with effective-feature and effective-weight fingerprints',
    'documented treatment of protocol forks, multi-chain deployments, token/protocol mismatch, incentivized activity and double-counted TVL',
    'out-of-sample/backtest and stress validation for liquidity, oracle, exploit, bridge and bad-debt scenarios',
    'no second DeFi dispatcher, evidence registry, queue, persistence authority or direct provider-to-score path',
  ]),
});

export const CRYPTO_RESEARCH_MODEL_CONTRACTS = Object.freeze([
  CRYPTO_MEME_RESEARCH_MODEL_CONTRACT,
  CRYPTO_DEFI_RESEARCH_MODEL_CONTRACT,
] as const);
