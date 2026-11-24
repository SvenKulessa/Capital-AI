import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  GROWTH_INTELLIGENCE_PLAN_PATH,
  buildGrowthIntelligenceDraftBundle,
  projectGrowthDataLayer,
} from './growth-intelligence-drafts.mjs';

test('offline Social Content Engine CLI projects the imported source snapshot', () => {
  const bundle = buildGrowthIntelligenceDraftBundle();
  assert.equal(bundle.contractVersion, 'CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1');
  assert.equal(bundle.sourcePath, GROWTH_INTELLIGENCE_PLAN_PATH);
  const bytes = readFileSync(fileURLToPath(new URL('../../' + GROWTH_INTELLIGENCE_PLAN_PATH, import.meta.url)));
  assert.equal(bundle.sourceSha256, createHash('sha256').update(bytes).digest('hex'));
  // Immutable snapshot: exact SHA-256 of the original 2026-11-20 exported JSON.
  assert.equal(bundle.sourceSha256, 'd08aa8e7f831dea7cb15010f46374f8fbdecaee1408619af1a4fb857460c1234');
  assert.equal(bundle.drafts.length, 7);
  assert.equal(bundle.publicPublishAllowed, false);
  assert.equal(bundle.publicationState, 'DRAFT_ONLY');
  assert.equal(bundle.providerCalls, 0);
  assert.equal(bundle.campaignSpend, 0);
  assert.equal(bundle.mediaAssetsProduced, 0);
  assert.ok(bundle.drafts.every((draft) => draft.socialPackage.approvals.length === 0));
  assert.ok(bundle.drafts.every((draft) => draft.socialPackage.deliveries.length === 0));
});

test('Legal Data Hunter appears only as a blocked candidate outside the immutable KPI snapshot', () => {
  const bundle = buildGrowthIntelligenceDraftBundle();
  assert.deepEqual(bundle.providerCandidates.map(({ id, commercialState, providerEnabled }) =>
    ({ id, commercialState, providerEnabled })), [{
    id: 'legal-data-hunter', commercialState: 'BLOCKED_ORDER_FORM_REQUIRED', providerEnabled: false,
  }]);
  assert.equal(bundle.providerCalls, 0);
  assert.ok(bundle.drafts.every(draft => !JSON.stringify(draft).includes('legal-data-hunter')));
});

test('repeat builds are content-addressed and byte-identical without provider state', () => {
  const a = JSON.stringify(buildGrowthIntelligenceDraftBundle());
  const b = JSON.stringify(buildGrowthIntelligenceDraftBundle());
  assert.equal(a, b);
});

// Offline-only next-round prompt drafts use the same existing Growth test entrypoint.
import './next-round-planner.test.mjs';

import './growth-intelligence-image-drafts.test.mjs';
// Offline Branding Kit, Graph context and commercial rights negative tests.
import './brand-kit-graph-drafts.test.mjs';

const identities = { GA4:'properties/123',GSC:'sc-domain:capital-ai.online',
  INSTAGRAM:'1234',YOUTUBE:'UCabcdefghijklmnopqrstuv' };
const asOf = '2026-11-24T04:00:00.000Z';
const sourceRecord = (source,payload,overrides={}) => ({
  source,identity:identities[source],startDate:'2026-11-17',endDate:'2026-11-23',
  observedAt:'2026-11-24T03:00:00.000Z',payload,...overrides,
});
const allRecords = () => [
  sourceRecord('GA4',{sessions:10,engagedSessions:3}),
  sourceRecord('GSC',{rows:[{clicks:2,impressions:10,ctr:0.2,position:4.5}]}),
  sourceRecord('INSTAGRAM',{reach:15,accounts_engaged:2}),
  sourceRecord('YOUTUBE',{columnHeaders:[{name:'views'},{name:'estimatedMinutesWatched'}],rows:[[12,6]]}),
];
const project = records => projectGrowthDataLayer({records,expectedIdentities:identities,asOf});
test('data layer keeps four aggregate sources separate and never self-attests',()=>{
  const result=project(allRecords());
  assert.equal(result.sources.length,4);
  assert.ok(result.sources.every(s=>s.status==='SOURCE_RECORDED_NOT_AUTHENTICATED' && /^[a-f0-9]{64}$/.test(s.evidenceSha256)));
  assert.deepEqual(result.sources[0].metrics,{sessions:10,engagedSessions:3});
  assert.deepEqual(result.sources[3].metrics,{views:12,estimatedMinutesWatched:6});
  assert.deepEqual(result.attributionEvents,[]);
  assert.equal(result.publicPublishAllowed,false);
  assert.equal(result.providerCalls,0);
  assert.deepEqual(project(allRecords()),result);
});
test('missing and duplicated sources do not block unrelated source or create zeros',()=>{
  const [ga,gsc]=allRecords();
  const result=project([ga,ga,gsc]);
  assert.equal(result.sources[0].status,'BLOCKED_DUPLICATE_SOURCE');
  assert.equal(result.sources[1].status,'SOURCE_RECORDED_NOT_AUTHENTICATED');
  assert.equal(result.sources[2].status,'NOT_PROVEN_NO_READBACK');
  assert.equal(result.sources[2].metrics,null);
  assert.equal(result.sources[3].metrics,null);
});
test('cross-account, untrusted authority, stale or malformed reports fail closed',()=>{
  const valid=allRecords();
  const cases=[
    [sourceRecord('GA4',{sessions:10,engagedSessions:3},{identity:'properties/999'}),'BLOCKED_IDENTITY_OR_ENVELOPE'],
    [{...valid[0],verified:true},'BLOCKED_IDENTITY_OR_ENVELOPE'],
    [sourceRecord('GA4',{sessions:10,engagedSessions:3},{observedAt:'2026-11-22T03:00:00.000Z',endDate:'2026-11-21'}),'NOT_PROVEN_STALE'],
    [sourceRecord('GA4',{sessions:1,engagedSessions:2}),'NOT_PROVEN_INVALID_METRICS'],
    [sourceRecord('GA4',{sessions:0,engagedSessions:0,token:'sensitive'}),'NOT_PROVEN_INVALID_OR_EMPTY_REPORT'],
    [sourceRecord('GA4',{sessions:0,engagedSessions:0},{endDate:'2026-11-31'}),'BLOCKED_INVALID_PERIOD'],
  ];
  for(const [row,status] of cases){
    const result=project([row,valid[1]]);
    assert.equal(result.sources[0].status,status);
    assert.equal(result.sources[0].metrics,null);
    assert.equal(result.sources[1].status,'SOURCE_RECORDED_NOT_AUTHENTICATED');
    assert.doesNotMatch(JSON.stringify(result),/sensitive/);
  }
  assert.equal(project([sourceRecord('GA4',{sessions:0,engagedSessions:0})]).sources[0].metrics.sessions,0);
});
test('GSC and YouTube enforce aggregate row and column identities; Instagram rejects daily sums',()=>{
  const result=project([
    sourceRecord('GSC',{rows:[]}),
    sourceRecord('INSTAGRAM',{reach:[2,3],accounts_engaged:1}),
    sourceRecord('YOUTUBE',{columnHeaders:[{name:'estimatedMinutesWatched'},{name:'views'}],rows:[[12,6]]}),
  ]);
  assert.equal(result.sources[1].status,'NOT_PROVEN_INVALID_OR_EMPTY_REPORT');
  assert.equal(result.sources[2].status,'NOT_PROVEN_INVALID_METRICS');
  assert.equal(result.sources[3].status,'NOT_PROVEN_INVALID_OR_EMPTY_REPORT');
});
test('explicit data layer handoff preserves original content plans and publishing isolation',()=>{
  const baseline=buildGrowthIntelligenceDraftBundle();
  const result=buildGrowthIntelligenceDraftBundle({records:allRecords(),expectedIdentities:identities,asOf});
  assert.deepEqual(result.drafts,baseline.drafts);
  assert.equal(result.sourceSha256,baseline.sourceSha256);
  assert.equal(result.growthDataLayer.graphExecution,'NOT_PROVEN');
  assert.equal(result.growthDataLayer.automaticRecommendationPromotion,false);
  assert.ok(result.drafts.every(d=>d.socialPackage.approvals.length===0));
});
