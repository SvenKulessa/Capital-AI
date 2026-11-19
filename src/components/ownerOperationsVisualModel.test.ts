import test from 'node:test';
import assert from 'node:assert/strict';
import { readDashboardSnapshot } from './ownerOperationsModel';
import {
  ownerAgentRows, ownerEvidenceCounts, ownerEvidenceRows,
  ownerGa4Metrics, ownerPrTimeline, ownerSourceCounts,
} from './ownerOperationsVisualModel';

const now = Date.parse('2026-11-19T08:00:00Z');
const sha = 'a'.repeat(40);
function fixture() {
  const value = {
    schema: 'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1',
    private: true, readOnly: true, syntheticDataUsed: false,
    generatedAt: '2026-11-19T07:59:00Z',
    github: {
      status:'VERIFIED_PROVIDER_READ',mainSha:sha,openPrCount:2,openPrCountStatus:'VERIFIED',
      pullRequestsStatus:'VERIFIED',
      pullRequests:[
        {number:42,title:'[CAPITAL-AI-PLATFORM] Verified',draft:false,headSha:sha,updatedAt:'2026-11-19T07:00:00Z'},
        {number:43,title:'[CAPITAL-AI-GROWTH] Verified',draft:true,headSha:sha,updatedAt:'2026-11-17T06:00:00Z'},
      ],
      ci:{status:'VERIFIED_PROVIDER_READ',runs:[
        {name:'Docker Security Gate',status:'completed',conclusion:'success',requiredByRootPolicy:true},
        {name:'Domain Governance',status:'completed',conclusion:'success',requiredByRootPolicy:true},
      ]},
    },
    render:{status:'VERIFIED_PROVIDER_READ',deployStatus:'live',deployments:[
      {deployId:'dep-fake',deployStatus:'live',sourceCommitSha:sha,finishedAt:'2026-11-19T07:00:00Z'}]},
    ga4:{status:'VERIFIED_PROVIDER_READ',events:[{eventName:'page_view',eventCount:4},{eventName:'purchase',eventCount:0}],
      revenue:null,revenueStatus:'NOT_PROVEN_NOT_QUERIED'},
    comparison:{mainVsDeploy:'MATCH_PROVIDER_CLAIMS_ONLY',runtimeBuildIdentity:'NOT_PROVEN_INDEPENDENT_READBACK'},
  };
  return readDashboardSnapshot(value)!;
}
test('owner visual KPI projections are readback-only and do not infer money or agent health', () => {
  const snapshot=fixture();
  assert.equal(ownerGa4Metrics(snapshot).views,4);
  assert.equal(ownerGa4Metrics(snapshot).purchaseEvents,0);
  assert.equal(ownerGa4Metrics(snapshot).confirmedRevenue,null);
  assert.deepEqual(ownerAgentRows(snapshot).filter(r=>r.prCount===1).map(r=>r.agent),['PLATFORM','GROWTH']);
  assert.ok(ownerAgentRows(snapshot).every(r=>r.runtime==='NOT_PROVEN'));
});
test('evidence ring is based on explicit control plane evidence, not optimistic live labels', () => {
  const rows=ownerEvidenceRows(fixture());
  assert.equal(ownerEvidenceCounts(rows).verified,4);
  assert.equal(ownerEvidenceCounts(rows).notProven,2);
  assert.ok(rows.find(r=>r.label==='Stripe-Umsatz')?.status==='NOT_PROVEN');
});
test('failed required check blocks gate evidence without making an unauthorized merge decision', () => {
  const s=fixture();
  s.github.ci!.runs[0].conclusion='failure';
  const result=ownerEvidenceRows(s);
  assert.equal(result.find(r=>r.label==='Main-CI / Security-Gates')?.status,'BLOCKED');
});
test('PR series only exists for a complete, valid inventory and uses actual timestamps', () => {
  const snapshot=fixture();
  const series=ownerPrTimeline(snapshot,now)!;
  assert.equal(series.length,7);
  assert.equal(series.reduce((a,b)=>a+b.count,0),2);
  snapshot.github.pullRequestsStatus='PARTIAL_FIRST_50';
  assert.equal(ownerPrTimeline(snapshot,now),null);
  snapshot.github.pullRequestsStatus='VERIFIED';
  snapshot.github.pullRequests![0].updatedAt=null;
  assert.equal(ownerPrTimeline(snapshot,now),null);
});
test('cross-source counts preserve distinct scopes and refuse untrusted event values', () => {
  const s=fixture();
  assert.deepEqual(ownerSourceCounts(s).map(p=>p.count),[2,1,4]);
  s.ga4.events![0].eventCount='100' as unknown as number;
  assert.equal(ownerSourceCounts(s)[2].count,null);
  s.ga4.status='NOT_PROVEN';
  assert.equal(ownerGa4Metrics(s).views,null);
});
