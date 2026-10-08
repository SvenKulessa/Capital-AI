import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FINANCE_PINNED_SOURCE_SHA } from '../../../contracts/financeResearchFeatureBridge.ts';
import { inspectFinanceHistoricalParityCandidate,
  type FinanceHistoricalParityCandidateInput } from '../FinanceHistoricalParityAudit.ts';

const now=Date.parse('2026-10-08T12:00:00.000Z');
const time=(n:number)=>new Date(now+n).toISOString();
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const archiveRef='archive://synthetic/stock-trend',sourceRef='source-output://synthetic/stock';
const featureRef='evidence://synthetic/trend',normRef='normalizer://synthetic/trend';
const identityRef='identity://synthetic/stock';
const providerId='governed-provider';
const permit=(allowed:boolean)=>({allowed,evidenceReference:'license://research',obligations:[]});
const rights={providerId,applicableEntityAndRegion:'EU research',
  subscriptionTierAndAddOns:'research plan',
  feedsSymbolsAndVenues:['ohlc:AAPL:XNAS'],
  contractOrPermissionReference:'license://research',
  validUntil:'2027-10-08T00:00:00.000Z',
  reviewedAt:'2026-10-07T00:00:00.000Z',
  permissions:{
    internal_analysis:permit(true),scientific_research_tdm:permit(false),
    public_display:permit(false),api_redistribution:permit(false),
    derived_scoring_research:permit(true),cache_retention:permit(true),
    export_resale:permit(false),
  },scientificResearchTdm:null,
};

function sample(score=80):FinanceHistoricalParityCandidateInput {
  const archive='SYNTHETIC_TEST_BYTES_NEVER_HISTORICAL_EVIDENCE';
  const output=JSON.stringify({
    sourceRepository:'SvenKulessa/Finance',sourceCommit:FINANCE_PINNED_SOURCE_SHA,
    modelId:'traditional-scoring',modelVersion:'2.1.0',assetId:'stock:AAPL',
    decisionAt:time(0),generatedAt:time(-100),
    sourceInputFingerprint:'a'.repeat(64),providerArchiveSha256:sha(archive),score,
  });
  return {
    reference:{observedAt:time(-1000),availableAt:time(-950),capturedAt:time(-900),
      decisionAt:time(0),providerArchiveEvidenceRef:archiveRef,
      providerArchiveBytes:archive,providerArchiveSha256:sha(archive),
      sourceResultEvidenceRef:sourceRef,sourceResultBytes:output,sourceResultSha256:sha(output)},
    researchInput:{
      snapshot:{runId:'synthetic-research-parity',evaluatedAt:now,
        horizon:'1d',regime:'baseline',isDemo:false,
        asset:{assetId:'stock:AAPL',symbol:'AAPL',name:'Apple',
          assetClass:'equity_us',venue:'XNAS',currency:'USD',status:'active'},
        features:[],rights,
        rawInputReferences:[archiveRef,sourceRef,identityRef,featureRef,normRef]},
      sourceModel:{sourceCommit:FINANCE_PINNED_SOURCE_SHA,
        sourceAsset:{contractVersion:'uai/1.0.0',assetId:'stock:AAPL',
          symbol:'AAPL',assetClass:'stock',instrumentKind:null},
        modelId:'traditional-scoring',modelVersion:'2.1.0',
        targetIdentityEvidenceRef:identityRef},
      validatedData:{sourceRepository:'SvenKulessa/Finance',
        sourceCommit:FINANCE_PINNED_SOURCE_SHA,
        sourceContractVersion:'validated-data-input/1.0.0',
        correlationId:'synthetic-research-parity',assetId:'stock:AAPL',
        symbol:'AAPL',evaluatedAt:time(0),aggregateStatus:'PASS',
        provenanceComplete:true,missingRequiredFields:[],nonComputableReasons:[],
        observations:[{sourceField:'finance.traditional.trend',
          featureId:'finance.stock.trend',status:'PASS',value:0.8,
          unit:'normalized-0-1',normalizedValue:80,
          normalizationVersion:'1.0.0',normalizationEvidenceRef:normRef,
          qualityScore:98,observedAt:time(-1000),retrievedAt:time(-900),
          provenance:{providerId,providerDataset:'ohlc',observedAt:now-1000,
            receivedAt:now-900,publishedAt:now-950,latencyMs:100,
            isDelayed:false,isDemo:false,sourceReference:featureRef,
            licenseScope:'public_realtime'}}]},
      factorModel:'stock',bindings:[{factor:'trend',sourceField:'finance.traditional.trend'}],
    },
  };
}
test('matched synthetic research sample is not historical proof or production authority',()=>{
  const r=inspectFinanceHistoricalParityCandidate(sample());
  assert.equal(r.state,'RESEARCH_MATCH_CANDIDATE',r.reasons.join(','));
  assert.equal(r.sourceScore,80);
  assert.equal(r.targetResearchScore,80);
  assert.match(r.contentPairFingerprint!,/^[0-9a-f]{64}$/);
  assert.equal(r.empiricalHistoricalParityProven,false);
  assert.equal(r.scoreEligible,false);
  assert.equal(r.productionEligible,false);
});
test('numerical mismatch is visible without asserting real source data',()=>{
  const r=inspectFinanceHistoricalParityCandidate(sample(79.9));
  assert.equal(r.state,'RESEARCH_MISMATCH',r.reasons.join(','));
  assert.equal(r.empiricalHistoricalParityProven,false);
});
test('tampering archive and source bytes blocks the candidate',()=>{
  const original=sample();
  const badArchive=inspectFinanceHistoricalParityCandidate({
    ...original,reference:{...original.reference,providerArchiveBytes:'TAMPERED'}});
  assert.equal(badArchive.state,'BLOCKED');
  assert.ok(badArchive.reasons.includes('FINANCE_HISTORICAL_ARCHIVE_DIGEST_MISMATCH'));
  const badResult=inspectFinanceHistoricalParityCandidate({
    ...original,reference:{...original.reference,sourceResultBytes:'{"score":10}'}});
  assert.equal(badResult.state,'BLOCKED');
  assert.ok(badResult.reasons.includes('FINANCE_SOURCE_RESULT_DIGEST_MISMATCH'));
});
test('lookahead capture and late source result fail closed',()=>{
  const original=sample();
  const lookahead=inspectFinanceHistoricalParityCandidate({
    ...original,reference:{...original.reference,capturedAt:time(1)}});
  assert.equal(lookahead.state,'BLOCKED');
  assert.ok(lookahead.reasons.includes('FINANCE_HISTORICAL_VINTAGE_ORDER_UNPROVEN'));
  const result=JSON.parse(original.reference.sourceResultBytes as string);
  result.generatedAt=time(1);
  const bytes=JSON.stringify(result);
  const late=inspectFinanceHistoricalParityCandidate({...original,
    reference:{...original.reference,sourceResultBytes:bytes,sourceResultSha256:sha(bytes)}});
  assert.equal(late.state,'BLOCKED');
  assert.ok(late.reasons.includes('FINANCE_HISTORICAL_SOURCE_OUTPUT_TIME_UNPROVEN'));
});
test('missing references and denied Capital-AI provider rights fail closed',()=>{
  const original=sample();
  const noRefs=inspectFinanceHistoricalParityCandidate({
    ...original,researchInput:{...original.researchInput,
      snapshot:{...original.researchInput.snapshot,
        rawInputReferences:[identityRef,featureRef,normRef]}}});
  assert.equal(noRefs.state,'BLOCKED');
  assert.ok(noRefs.reasons.includes('FINANCE_HISTORICAL_ARTIFACT_EVIDENCE_UNBOUND'));
  const noRights=inspectFinanceHistoricalParityCandidate({
    ...original,researchInput:{...original.researchInput,
      snapshot:{...original.researchInput.snapshot,rights:[]}}});
  assert.equal(noRights.state,'BLOCKED');
  assert.ok(noRights.reasons.includes('FINANCE_HISTORICAL_TARGET_RESEARCH_NOT_ADMITTED'));
});
