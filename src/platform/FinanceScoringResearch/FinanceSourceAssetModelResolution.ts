/**
 * MARKET: source-accurate Finance UAI -> Capital-AI AssetIdentity/model descriptor resolution.
 *
 * Source: Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c
 * Scoring/contracts.ts, ScoringModelRegistry.ts, UniversalAssetAdapter.ts.
 *
 * This is NOT a second model dispatcher. It only records explicit asset/model identity
 * correspondence; rights/feature validation and all executions stay in CAPITAL-AI.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PipelineSnapshotSchema, type PipelineSnapshot } from '../../contracts/pipelineExecution.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../../contracts/financeResearchFeatureBridge.ts';
import {
  getFinanceSourceModel, type FinanceSourceModel,
} from './FinanceSourceModelCatalog.ts';

export const FINANCE_ASSET_MODEL_RESOLUTION_VERSION = 'CAPITAL_AI_FINANCE_ASSET_MODEL_RESOLUTION@1' as const;
export const FINANCE_UAI_SOURCE_VERSION = 'uai/1.0.0' as const;
const id = z.string().trim().min(1).max(256);
const sourceIdentity = z.strictObject({
  contractVersion: z.literal(FINANCE_UAI_SOURCE_VERSION),
  assetId: id,
  symbol: id,
  assetClass: z.enum(['crypto','stock','forex','commodity','index','bond']),
  instrumentKind: id.nullable(),
});
export const FinanceSourceAssetModelRequestSchema = z.strictObject({
  sourceCommit: z.literal(FINANCE_PINNED_SOURCE_SHA),
  sourceAsset: sourceIdentity,
  modelId: id,
  modelVersion: id,
  targetIdentityEvidenceRef: id,
});
export type FinanceSourceAssetModelRequest = z.infer<typeof FinanceSourceAssetModelRequestSchema>;

const targetClasses = {
  crypto: ['crypto'],
  stock: ['equity_us', 'equity_eu'],
  forex: ['forex'],
  commodity: ['commodities'],
  index: [],
  bond: ['fixed_income'],
} as const;

const cryptoSubclassByModel: Readonly<Record<string,string>> = {
  'crypto-meme-integrity': 'meme_ai_token',
  'crypto-defi-fundamental': 'defi_protocol',
};
const commoditySubclassByInstrument: Readonly<Record<string,string>> = {
  'commodity-energy-benchmark': 'energy_crude_gas',
  'commodity-industrial-metal-benchmark': 'industrial_metal',
  'commodity-precious-metal-benchmark': 'precious_metal',
  // Agricultural commodities do not yet have a governed target subclass.
};

type Blocked = Readonly<{
  version: typeof FINANCE_ASSET_MODEL_RESOLUTION_VERSION;
  state: 'BLOCKED';
  reasons: readonly string[];
  model: null;
  fingerprint: null;
  scoreEligible: false;
  dataAdmitted: false;
  productionEligible: false;
}>;
const blocked = (reasons: readonly string[]): Blocked => Object.freeze({
  version: FINANCE_ASSET_MODEL_RESOLUTION_VERSION,
  state:'BLOCKED', reasons:Object.freeze([...new Set(reasons)].sort()),
  model:null, fingerprint:null, scoreEligible:false,
  dataAdmitted:false, productionEligible:false,
});

export function resolveFinanceSourceAssetModel(input: {
  snapshot: PipelineSnapshot;
  request: FinanceSourceAssetModelRequest;
}) {
  const snapshot = PipelineSnapshotSchema.parse(input.snapshot);
  const parsed = FinanceSourceAssetModelRequestSchema.safeParse(input.request);
  if (!parsed.success) return blocked(['FINANCE_UAI_SOURCE_REQUEST_INVALID']);
  const req = parsed.data;
  const source = req.sourceAsset, target = snapshot.asset;
  const reasons: string[] = [];
  const model: FinanceSourceModel | null = getFinanceSourceModel(req.modelId);

  if (!model) reasons.push('FINANCE_SOURCE_MODEL_UNREGISTERED');
  else {
    if (req.modelVersion !== model.version) reasons.push('FINANCE_SOURCE_MODEL_VERSION_MISMATCH');
    if (!model.assetClasses.includes(source.assetClass)) reasons.push('FINANCE_SOURCE_MODEL_ASSET_CLASS_MISMATCH');
    if (model.instrumentKinds?.length && (!source.instrumentKind || !model.instrumentKinds.includes(source.instrumentKind))) {
      reasons.push('FINANCE_SOURCE_MODEL_INSTRUMENT_MISMATCH');
    }
  }

  const normalizedSymbol = source.symbol.toUpperCase().trim();
  if (source.symbol !== normalizedSymbol || source.assetId !== source.assetClass + ':' + normalizedSymbol) {
    reasons.push('FINANCE_SOURCE_UAI_IDENTITY_INVALID');
  }
  if (target.symbol.toUpperCase() !== normalizedSymbol
      || !target.assetId.endsWith(':' + normalizedSymbol)
      || (source.assetClass === 'crypto' && target.assetId !== source.assetId)
      || !targetClasses[source.assetClass].some(t => t === target.assetClass)) {
    reasons.push('FINANCE_SOURCE_TARGET_IDENTITY_MISMATCH');
  }
  if (source.assetClass === 'index') reasons.push('FINANCE_TARGET_INDEX_TAXONOMY_UNAVAILABLE');
  if (snapshot.isDemo || target.status !== 'active') reasons.push('FINANCE_SOURCE_MODEL_ASSET_NOT_ACTIVE');
  if (!snapshot.rawInputReferences.includes(req.targetIdentityEvidenceRef)) {
    reasons.push('FINANCE_TARGET_IDENTITY_EVIDENCE_MISSING');
  }

  const expectedCryptoSubclass = cryptoSubclassByModel[req.modelId];
  if (expectedCryptoSubclass && target.subclass !== expectedCryptoSubclass) {
    reasons.push('FINANCE_CRYPTO_RESEARCH_SUBCLASS_MISMATCH');
  }
  const expectedCommoditySubclass = source.instrumentKind
    ? commoditySubclassByInstrument[source.instrumentKind] : undefined;
  if (source.assetClass === 'commodity' && source.instrumentKind?.includes('agriculture')) {
    reasons.push('FINANCE_COMMODITY_AGRICULTURE_TARGET_SUBCLASS_UNAVAILABLE');
  } else if (expectedCommoditySubclass && target.subclass !== expectedCommoditySubclass) {
    reasons.push('FINANCE_COMMODITY_TARGET_SUBCLASS_MISMATCH');
  }
  if (source.assetClass === 'bond' && (
    source.instrumentKind !== 'government-benchmark-yield'
    || !['sovereign_yield_10y_2y','german_bund'].includes(target.subclass ?? '')
  )) reasons.push('FINANCE_INDIVIDUAL_BOND_SCORING_UNSUPPORTED');

  if (reasons.length || !model) return blocked(reasons);
  const fingerprint = createHash('sha256').update(JSON.stringify({
    version: FINANCE_ASSET_MODEL_RESOLUTION_VERSION,
    sourceCommit: FINANCE_PINNED_SOURCE_SHA,
    sourceAsset: source,
    targetAssetId: target.assetId,
    targetAssetClass: target.assetClass,
    targetAssetSubclass: target.subclass ?? null,
    venue: target.venue,
    modelId: model.modelId,
    modelVersion: model.version,
    identityEvidenceRef: req.targetIdentityEvidenceRef,
  })).digest('hex');
  return Object.freeze({
    version: FINANCE_ASSET_MODEL_RESOLUTION_VERSION,
    state: 'IDENTITY_MAPPED' as const,
    reasons: Object.freeze([] as string[]),
    sourceAsset: source,
    targetAssetId: target.assetId,
    model: Object.freeze({
      modelId: model.modelId,
      modelVersion: model.version,
      sourceLifecycle: model.lifecycle,
      sourceEvidencePolicy: model.evidencePolicy,
      sourceScoreEligible: model.sourceScoreEligible,
      featureContractVersion: model.featureContractVersion,
    }),
    fingerprint,
    scoreEligible: false as const, dataAdmitted: false as const,
    productionEligible: false as const,
  });
}
