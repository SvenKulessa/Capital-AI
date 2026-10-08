/**
 * Immutable source-faithful Finance model inventory, without a second dispatcher.
 * Source catalogue admission does not authorize CAPITAL-AI scoring, ranking or production.
 * Source: SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c.
 */
import { CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION, CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION } from './CryptoResearchModelContracts';
import {
  COMMODITY_ENERGY_RESEARCH_FEATURE_CONTRACT_VERSION,
  COMMODITY_INDUSTRIAL_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
  COMMODITY_PRECIOUS_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
  COMMODITY_AGRICULTURE_RESEARCH_FEATURE_CONTRACT_VERSION,
} from './CommodityResearchModelContracts';
const SCORING_MODEL_REGISTRY_VERSION = 'scoring-model-registry/1.1.0' as const;
const CANONICAL_SCORE_RESULT_CONTRACT_VERSION = 'scoring-integrity/1.1.0' as const;
const LEGACY_CANONICAL_SCORE_RESULT_CONTRACT_VERSION = 'scoring-integrity/1.0.0' as const;
const VERIFIED_CRYPTO_TECHNICAL_EXECUTOR_KEY = 'verifiedCryptoTechnicalScoring.evaluateVerifiedCryptoTechnicalScore' as const;
const TRADITIONAL_SCORING_EXECUTOR_KEY = 'TraditionalAssetScoringService.scoreTraditionalAsset' as const;
const COMMODITY_EVIDENCE_EXECUTOR_KEY = 'scoreCommodityMarketEvidence' as const;
const SOVEREIGN_BENCHMARK_EXECUTOR_KEY = 'scoreSovereignBenchmarkEvidence' as const;
const RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY = 'research-only:not-executable' as const;
type FinanceSourceAssetClass = 'crypto' | 'stock' | 'forex' | 'index' | 'commodity' | 'bond';
export interface ScoringModelDescriptor {
  registryVersion: typeof SCORING_MODEL_REGISTRY_VERSION;
  modelId: string;
  version: string;
  alias: 'champion' | 'challenger' | 'legacy' | 'blocked';
  lifecycle: 'canonical' | 'challenger' | 'legacy' | 'blocked';
  assetClasses: readonly FinanceSourceAssetClass[];
  instrumentKinds?: readonly string[];
  featureContractVersion: string;
  resultContractVersion: string;
  evidencePolicy: 'verified-required' | 'research-only' | 'unsupported';
  executorKey: string;
  priority: number;
  scoreEligible?: boolean;
  canonicalResultAdapterRequired: boolean;
  notes?: string;
}

const DEFAULT_MODELS: readonly ScoringModelDescriptor[] = [
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'crypto-technical-provenance',
    version: '0.7.0',
    alias: 'champion',
    lifecycle: 'canonical',
    assetClasses: ['crypto'],
    featureContractVersion: 'crypto-technical-features/0.7.0',
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'verified-required',
    executorKey: VERIFIED_CRYPTO_TECHNICAL_EXECUTOR_KEY,
    priority: 100,
    scoreEligible: true,
    canonicalResultAdapterRequired: false,
    notes: 'Verified crypto champion. Simulated/bootstrap values and caller classification are not scoring evidence.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'crypto-meme-integrity',
    version: '0.3.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['crypto'],
    featureContractVersion: CRYPTO_MEME_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 10,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Source-backed Meme research challenger with deterministic research evaluator, holder/rug/social/execution feature inventory and hard gates. Still non-executable: productive promotion requires verified provider coverage, backtesting, correlation review and explicit Owner approval.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'crypto-defi-fundamental',
    version: '0.3.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['crypto'],
    featureContractVersion: CRYPTO_DEFI_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 10,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Source-backed DeFi research challenger with deterministic research evaluator across utilization, revenue, liquidity, contract security, oracle, tokenomics, governance and ecosystem factors. DeFiLlama stays evidence-only; productive promotion remains blocked pending verified coverage/backtesting.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'traditional-scoring',
    version: '2.1.0',
    alias: 'champion',
    lifecycle: 'canonical',
    assetClasses: ['stock', 'forex', 'index'],
    featureContractVersion: 'traditional-features/2.1.0',
    resultContractVersion: LEGACY_CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'verified-required',
    executorKey: TRADITIONAL_SCORING_EXECUTOR_KEY,
    priority: 100,
    scoreEligible: true,
    canonicalResultAdapterRequired: false,
    notes: 'Evidence-aware stock/forex/index model normalized by the C3 CanonicalResultAdapter. Integrity 1.0.0 retained until its dedicated migration.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'commodity-evidence-scoring',
    version: '1.0.0',
    alias: 'champion',
    lifecycle: 'canonical',
    assetClasses: ['commodity'],
    featureContractVersion: 'commodity-market-evidence/1.0.0',
    resultContractVersion: LEGACY_CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'verified-required',
    executorKey: COMMODITY_EVIDENCE_EXECUTOR_KEY,
    priority: 100,
    scoreEligible: true,
    canonicalResultAdapterRequired: false,
    notes: 'ADR-0033 verified commodity market-evidence scorer executed only behind ScoringDispatcher. Category-specific commodity models remain non-executable challengers until explicit promotion.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'commodity-energy-hybrid',
    version: '0.1.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['commodity'],
    instrumentKinds: ['commodity-energy-benchmark'],
    featureContractVersion: COMMODITY_ENERGY_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 20,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Energy research challenger. EIA/market/CFTC/curve evidence is feature input only; owner-drive weights are hypotheses and are not executable.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'commodity-industrial-metals-hybrid',
    version: '0.1.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['commodity'],
    instrumentKinds: ['commodity-industrial-metal-benchmark'],
    featureContractVersion: COMMODITY_INDUSTRIAL_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 20,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Industrial/critical-metals research challenger. USGS physical supply and CRMA criticality remain separate evidence dimensions.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'commodity-precious-metals-hybrid',
    version: '0.1.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['commodity'],
    instrumentKinds: ['commodity-precious-metal-benchmark'],
    featureContractVersion: COMMODITY_PRECIOUS_METALS_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 20,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Precious-metals benchmark challenger. Resource-project ore-grade/tonnage/capex metrics are explicitly outside this model scope.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'commodity-agriculture-hybrid',
    version: '0.1.0',
    alias: 'challenger',
    lifecycle: 'challenger',
    assetClasses: ['commodity'],
    instrumentKinds: ['commodity-agriculture-benchmark'],
    featureContractVersion: COMMODITY_AGRICULTURE_RESEARCH_FEATURE_CONTRACT_VERSION,
    resultContractVersion: CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'research-only',
    executorKey: RESEARCH_ONLY_CHALLENGER_EXECUTOR_KEY,
    priority: 20,
    scoreEligible: false,
    canonicalResultAdapterRequired: true,
    notes: 'Agriculture research challenger. USDA PSD observations retain release/revision lineage; point-in-time validation is mandatory before promotion.',
  },
  {
    registryVersion: SCORING_MODEL_REGISTRY_VERSION,
    modelId: 'sovereign-benchmark-yield-scoring',
    version: '1.0.0',
    alias: 'champion',
    lifecycle: 'canonical',
    assetClasses: ['bond'],
    instrumentKinds: ['government-benchmark-yield'],
    featureContractVersion: 'sovereign-benchmark-yield-features/1.0.0',
    resultContractVersion: LEGACY_CANONICAL_SCORE_RESULT_CONTRACT_VERSION,
    evidencePolicy: 'verified-required',
    executorKey: SOVEREIGN_BENCHMARK_EXECUTOR_KEY,
    priority: 100,
    scoreEligible: true,
    canonicalResultAdapterRequired: false,
    notes: 'Only approved sovereign benchmark yield instruments are supported. Individual bond scoring remains blocked by ADR-0022. Integrity 1.0.0 retained until dedicated migration.',
  },
] as const;

export const FINANCE_SOURCE_MODEL_CATALOG = Object.freeze(DEFAULT_MODELS.map(model => Object.freeze({
  ...model, sourceScoreEligible: model.scoreEligible === true,
  // Metadata is source-only. The Capital-AI canonical ScoringEngineService is not bypassed.
  capitalProductionEligible: false as const,
  capitalScoreEligible: false as const,
})));
export type FinanceSourceModel = typeof FINANCE_SOURCE_MODEL_CATALOG[number];
export function getFinanceSourceModel(modelId: string): FinanceSourceModel | null {
  return FINANCE_SOURCE_MODEL_CATALOG.find(m => m.modelId === modelId) ?? null;
}
