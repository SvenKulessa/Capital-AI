import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScoringEngineService } from '../../../services/scoringEngine.ts';
import {
  projectFinanceValidatedDataToResearch, FINANCE_SOURCE_VALIDATED_DATA_VERSION,
} from '../FinanceValidatedDataHandoff.ts';
import { inspectFinancePointInTimeVintage } from '../FinancePointInTimeAdmission.ts';
import { FINANCE_PINNED_SOURCE_SHA } from '../../../contracts/financeResearchFeatureBridge.ts';

const now = Date.parse('2026-10-08T12:00:00.000Z');
const providerId = 'licensed-provider';
const sourceRef = 'evidence://finance/trend';
const normalizeRef = 'normalizer://finance/trend/v1';
const permission = (allowed: boolean) => ({allowed, evidenceReference:'license://provider', obligations:[]});
const rights = {
  providerId,applicableEntityAndRegion:'EU business',subscriptionTierAndAddOns:'licensed research',
  feedsSymbolsAndVenues:['ohlc:AAPL:XNAS','historical-eia:WTI:NYMEX'],
  contractOrPermissionReference:'license://provider',
  validUntil:'2027-10-08T12:00:00.000Z',reviewedAt:'2026-10-07T12:00:00.000Z',
  permissions:{
    internal_analysis:permission(true),scientific_research_tdm:permission(false),
    public_display:permission(false),api_redistribution:permission(false),
    derived_scoring_research:permission(true),cache_retention:permission(true),
    export_resale:permission(false),
  },scientificResearchTdm:null,
};
const provenance = {
  providerId,providerDataset:'ohlc',observedAt:now-1_000,receivedAt:now-900,
  publishedAt:now-800,latencyMs:100,isDelayed:false,isDemo:false,
  sourceReference:sourceRef,licenseScope:'public_realtime' as const,
};
const snapshot = {
  runId:'finance-dto-handoff', evaluatedAt:now, horizon:'1d',regime:'baseline',isDemo:false,
  asset:{assetId:'stock:AAPL',symbol:'AAPL',name:'Apple',assetClass:'equity_us' as const,
    venue:'XNAS',currency:'USD',status:'active' as const},
  features:[],rights:[rights],rawInputReferences:[sourceRef,normalizeRef],
};
const source = {
  sourceRepository:'SvenKulessa/Finance' as const,sourceCommit:FINANCE_PINNED_SOURCE_SHA,
  sourceContractVersion:FINANCE_SOURCE_VALIDATED_DATA_VERSION,
  correlationId:snapshot.runId,assetId:snapshot.asset.assetId,symbol:snapshot.asset.symbol,
  evaluatedAt:new Date(now).toISOString(),aggregateStatus:'PASS' as const,
  provenanceComplete:true,missingRequiredFields:[],nonComputableReasons:[],
  observations:[{
    sourceField:'finance.traditional.trend',featureId:'finance.stock.trend',status:'PASS' as const,
    value:0.8,unit:'normalized-0-1',normalizedValue:80,
    normalizationVersion:'1.0.0',normalizationEvidenceRef:normalizeRef,qualityScore:98,
    observedAt:new Date(now-1_000).toISOString(),retrievedAt:new Date(now-900).toISOString(),
    provenance,
  }],
};

test('source DATA handoff preserves one-to-one factors and computes only via Capital-AI service', () => {
  const mapped = projectFinanceValidatedDataToResearch({snapshot,source});
  assert.equal(mapped.state,'RESEARCH_MAPPABLE',mapped.reasons.join(','));
  if(mapped.state !== 'RESEARCH_MAPPABLE') throw new Error('expected admitted research');
  assert.equal(mapped.candidates[0].sourceEvidenceRef,sourceRef);
  assert.equal(mapped.candidates[0].feature.normalizedValue,80);
  const evaluated = ScoringEngineService.inspectValidatedFinanceResearchFactors({
    snapshot,source,model:'stock',
    bindings:[{factor:'trend',sourceField:'finance.traditional.trend'}],
  });
  assert.equal(evaluated.state,'RESEARCH_FACTORS_EVALUATED',evaluated.reasons.join(','));
  assert.equal(evaluated.research?.researchCompositeValue,80);
  assert.equal(evaluated.scoreEligible,false);
  assert.equal(evaluated.productionEligible,false);
});
test('Finance validated DATA fails closed for invented normalization, rights and stale source', () => {
  const noNorm = {...source,observations:source.observations.map(x=>({...x,normalizationEvidenceRef:null}))};
  assert.deepEqual(projectFinanceValidatedDataToResearch({snapshot,source:noNorm}).reasons,
    ['FINANCE_NORMALIZATION_EVIDENCE_MISSING','FINANCE_SOURCE_FEATURE_MAPPING_INCOMPLETE']);
  const noRights = {...snapshot,rights:[]};
  const r=projectFinanceValidatedDataToResearch({snapshot:noRights,source});
  assert.equal(r.state,'BLOCKED');assert.ok(r.reasons.includes('PROVIDER_RIGHTS_MISSING'));
  const stale = {...source,observations:source.observations.map(x=>({
    ...x,observedAt:new Date(now-80_000).toISOString(),
    retrievedAt:new Date(now-79_900).toISOString(),
    provenance:{...provenance,observedAt:now-80_000,receivedAt:now-79_900,publishedAt:now-79_800},
  }))};
  const blocked=projectFinanceValidatedDataToResearch({snapshot,source:stale});
  assert.equal(blocked.state,'BLOCKED');assert.ok(blocked.reasons.includes('FEATURE_STALE'));
  const invalid = {...source,aggregateStatus:'FAIL' as const};
  assert.ok(projectFinanceValidatedDataToResearch({snapshot,source:invalid}).reasons.includes('FINANCE_DATA_STATUS_NOT_ADMISSIBLE'));
  const wrongAsset = {...source,assetId:'stock:MSFT'};
  assert.ok(projectFinanceValidatedDataToResearch({snapshot,source:wrongAsset}).reasons.includes('FINANCE_VALIDATED_ASSET_IDENTITY_MISMATCH'));
});
const vintage = {
  providerId:'eia' as const,assetId:'commodities:WTI',symbol:'WTI',domain:'energy' as const,
  featureKey:'inventories',value:120,unit:'mbbl',source:'EIA',sourceVersion:'1.0.0',
  sourcePath:'archived-release://eia/2022-09-03',
  observedAt:'2022-09-01T00:00:00.000Z',availableAt:'2022-09-03T00:00:00.000Z',
  retrievedAt:'2026-10-01T00:00:00.000Z',evidenceId:'vintage://eia/2022-09',
  releaseId:'eia-2022-09',revisionId:'rev-0',
  availabilityEvidenceId:'archive://eia/release-2022-09',
  acquisitionMode:'ARCHIVED_RELEASE_CAPTURE' as const,
};
const pit = {
  sourceCommit:FINANCE_PINNED_SOURCE_SHA,providerId,
  asset:{assetId:'commodities:WTI',symbol:'WTI',name:'WTI Benchmark',assetClass:'commodities' as const,
    venue:'NYMEX',currency:'USD',status:'active' as const},providerDataset:'historical-eia',
  venue:'NYMEX',evaluatedAt:'2026-10-08T12:00:00.000Z',
  decisionAt:'2022-09-04T00:00:00.000Z',rights,vintage,
};
test('archived source release is admitted for research only when available at decision time', () => {
  const result = inspectFinancePointInTimeVintage(pit);
  assert.equal(result.state,'PIT_RESEARCH_ADMITTED',result.reasons.join(','));
  assert.equal(result.vintage?.evidenceGrade,'PIT_VERIFIED');
  assert.equal(result.scoreEligible,false);
  assert.equal(result.productionEligible,false);
  assert.ok(result.vintage?.contentFingerprint);
});
test('PIT admission rejects lookahead, latest-history leakage and missing provider rights', () => {
  const future = inspectFinancePointInTimeVintage({...pit,decisionAt:'2022-09-02T00:00:00.000Z'});
  assert.equal(future.state,'BLOCKED');
  assert.ok(future.reasons.includes('FINANCE_PIT_LOOKAHEAD_AVAILABILITY'));
  const revised = inspectFinancePointInTimeVintage({...pit,vintage:{...vintage,acquisitionMode:'LIVE_API_CURRENT_HISTORY' as const}});
  assert.ok(revised.reasons.includes('FINANCE_PIT_VINTAGE_EVIDENCE_INSUFFICIENT'));
  const denied = inspectFinancePointInTimeVintage({...pit,rights:{...rights,permissions:{
    ...rights.permissions,derived_scoring_research:permission(false),
  }}});
  assert.ok(denied.reasons.includes('FINANCE_PIT_RIGHTS_NOT_ADMITTED'));
  const wrongAsset = inspectFinancePointInTimeVintage({
    ...pit,asset:{...pit.asset,assetId:'commodities:BRENT'},
  });
  assert.ok(wrongAsset.reasons.includes('FINANCE_PIT_TARGET_ASSET_IDENTITY_MISMATCH'));
  const notScoped = inspectFinancePointInTimeVintage({...pit,providerDataset:'unknown'});
  assert.ok(notScoped.reasons.includes('FINANCE_PIT_PROVIDER_FEED_OUT_OF_SCOPE'));
});
