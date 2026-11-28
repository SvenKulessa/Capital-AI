import assert from 'node:assert/strict';
import test from 'node:test';
import { appendSnapshot, applyOwnerEdit, exportWorkspace, importWorkspace, initialRows, projectGa4, projectGsc, projectGraphHandoff, publicSurfaceRows, addMissingPublicSurfaceRows, publicSurfaceResearchTask } from './growthOwnerWorkspaceModel';
const at = '2026-11-24T12:00:00.000Z';
const row = initialRows()[0];
const good = { schema: 'CAPITAL_AI_GROWTH_GA4_READBACK@1', source: 'GA4_DATA_API', private: true, readOnly: true, publicPublishAllowed: false,
  attributionAuthority: 'SEPARATE_FROM_UMAMI_GSC_SOCIAL', observedAt: at, status: 'PROVIDER_READ_VERIFIED', metrics: { sessions: 10, engagedSessions: 3 } };
test('initial inventory is not live evidence and covers five domains', () => {
  assert.equal(new Set(initialRows().map(r => r.domain)).size, 5);
  assert.ok(initialRows().every(r => r.status === 'NOT_PROVEN'));
});
test('actual GA4 response is scoped, strict and zero distinct from missing', () => {
  assert.equal(projectGa4(good,row).status,'VERIFIED');
  assert.equal(projectGa4({...good,metrics:{sessions:0,engagedSessions:0}},row).status,'VERIFIED');
  assert.equal(projectGa4({...good,status:'NOT_PROVEN_NO_ROWS',metrics:null},row).status,'NOT_PROVEN');
  for (const payload of [{...good,private:false},{...good,publicPublishAllowed:true},{...good,metrics:null},{...good,metrics:{sessions:1,engagedSessions:2}}]) {
    assert.throws(() => projectGa4(payload,row));
  }
  assert.throws(() => projectGa4(good,initialRows()[1]));
});
test('versioned import preserves history but never promotes imported claims', () => {
  const a = appendSnapshot([],initialRows(),at);
  const b = appendSnapshot(a,[projectGa4(good,row)],at);
  assert.equal(a[0].rows[0].status,'NOT_PROVEN');
  assert.equal(b[1].version,2);
  const result = importWorkspace(exportWorkspace(b));
  assert.equal(result[1].rows[0].status,'NOT_PROVEN');
  assert.equal(result[1].rows[0].origin,'OWNER_NOTE');
  assert.equal(applyOwnerEdit(projectGa4(good,row)).status,'NOT_PROVEN');
});
test('invalid schemas, duplicate IDs and oversized input fail closed', () => {
  assert.throws(() => importWorkspace('{}'));
  assert.throws(() => importWorkspace(' '.repeat(5_000_001)));
  assert.throws(() => appendSnapshot([],[row,row],at));
  const b = JSON.parse(exportWorkspace(appendSnapshot([],[row],at)));
  b.snapshots[0].rows[0].token = 'synthetic';
  assert.throws(() => importWorkspace(JSON.stringify(b)));
});

const reportSha='a'.repeat(64);
const graphReport={
  contractVersion:'CAPITAL_AI_GROWTH_GRAPH_HANDOFF@1',engine:'langgraph',quality:'PASS_WITH_GAPS',
  sources:['GA4','GSC','INSTAGRAM','YOUTUBE'].map((source,i)=>({source,
    status:i===0?'SOURCE_RECORDED_NOT_AUTHENTICATED':'NOT_PROVEN_NO_READBACK',
    transport:i===0?'READ_RESPONSE_RECEIVED':'AUTH_REQUIRED',evidenceSha256:i===0?'b'.repeat(64):null})),
  eligibleForDraftReview:true,providerAuthentication:'NOT_PROVEN_BY_GRAPH',
  attributionEvents:[],publicationAllowed:false,costActivationAllowed:false,automaticChanges:false,
};
test('graph import keeps live GA4 separate and archives only status references',()=>{
  const live=[projectGa4(good,row),...initialRows().slice(1)];
  const projected=projectGraphHandoff(JSON.stringify(graphReport),reportSha,live);
  assert.deepEqual(projected.slice(0,live.length),live);
  assert.equal(projected.length,live.length+5);
  assert.ok(projected.slice(live.length).every(r=>r.status==='NOT_PROVEN'&&r.origin==='OWNER_NOTE'));
  assert.match(projected.find(r=>r.id==='graph-source-ga4')!.evidence,/bbbbbbbb/);
  const restored=importWorkspace(exportWorkspace(appendSnapshot([],projected,at)));
  assert.ok(restored[0].rows.every(r=>r.status==='NOT_PROVEN'));
  const blocked=projectGraphHandoff(JSON.stringify({...graphReport,quality:'BLOCKED',sources:[],eligibleForDraftReview:false}),reportSha,projected);
  assert.equal(blocked.filter(r=>r.id.startsWith('graph-source-')).length,0);
  assert.equal(blocked[0].status,'VERIFIED');
});
test('graph report rejects forged authority, raw metrics, inconsistent sources and invalid digest',()=>{
  for(const value of [
    {...graphReport,publicationAllowed:true},
    {...graphReport,providerAuthentication:'VERIFIED'},
    {...graphReport,eligibleForDraftReview:false},
    {...graphReport,sources:[graphReport.sources[0],...graphReport.sources.slice(0,3)]},
    {...graphReport,sources:[{...graphReport.sources[0],metrics:{sessions:1}},...graphReport.sources.slice(1)]},
    {...graphReport,sources:[{...graphReport.sources[0],evidenceSha256:null},...graphReport.sources.slice(1)]},
  ])assert.throws(()=>projectGraphHandoff(JSON.stringify(value),reportSha,initialRows()));
  assert.throws(()=>projectGraphHandoff(JSON.stringify(graphReport),'bad',initialRows()));
  assert.throws(()=>projectGraphHandoff(' '.repeat(16385),reportSha,initialRows()));
});

const conversionGraphReport={
  contractVersion:'CAPITAL_AI_X_CONVERSION_GRAPH_HANDOFF@1',engine:'langgraph',
  quality:'PASS_WITH_GAPS',nextAction:'VERIFY_SOURCE_AND_COHORT',
  providerAuthentication:'NOT_PROVEN_BY_GRAPH',registrations:null,paidSubscriptions:null,
  revenueCents:null,publicationAllowed:false,costActivationAllowed:false,automaticChanges:false,
};
test('conversion graph import is reference-only, versioned and preserves every live source',()=>{
  const live=[projectGa4(good,row),...initialRows().filter(r=>r.id!==row.id)];
  const imported=projectGraphHandoff(JSON.stringify(conversionGraphReport),reportSha,live);
  assert.deepEqual(imported.slice(0,-1),live);
  const graph=imported.at(-1)!;
  assert.equal(graph.id,'x-conversion-graph-handoff');
  assert.equal(graph.status,'NOT_PROVEN');
  assert.equal(graph.origin,'OWNER_NOTE');
  assert.match(graph.evidence,new RegExp(reportSha));
  const blocked={...conversionGraphReport,quality:'BLOCKED',nextAction:'REPAIR_INPUT'};
  const updated=projectGraphHandoff(JSON.stringify(blocked),reportSha,imported);
  assert.equal(updated.length,imported.length);
  assert.deepEqual(updated.slice(0,-1),live);
  assert.match(updated.at(-1)!.operation,/BLOCKED/);
  assert.equal(updated.at(-1)!.status,'NOT_PROVEN');
  const restored=importWorkspace(exportWorkspace(appendSnapshot([],updated,at)))[0].rows;
  assert.equal(restored.at(-1)!.status,'NOT_PROVEN');
});
test('conversion graph import rejects fabricated metrics, authority and inconsistent quality',()=>{
  for(const wrong of [
    {registrations:0},{paidSubscriptions:1},{revenueCents:0},{providerAuthentication:'VERIFIED'},
    {publicationAllowed:true},{costActivationAllowed:true},{automaticChanges:true},
    {quality:'BLOCKED'},{nextAction:'REPAIR_INPUT'},{candidateRegistrations:1},
    {subjectKey:'synthetic'},{contractVersion:'CAPITAL_AI_X_CONVERSION_GRAPH_HANDOFF@2'},
  ])assert.throws(()=>projectGraphHandoff(JSON.stringify({...conversionGraphReport,...wrong}),reportSha,initialRows()));
  assert.throws(()=>projectGraphHandoff(JSON.stringify(conversionGraphReport),'bad',initialRows()));
  assert.throws(()=>projectGraphHandoff(' '.repeat(16385),reportSha,initialRows()));
});

test('public surface planning rows are unique, idempotent and never claim live evidence', () => {
  const audit = publicSurfaceRows();
  assert.equal(audit.length, 10);
  assert.equal(new Set(audit.map(r => r.id)).size, 10);
  assert.ok(audit.every(r => r.status === 'NOT_PROVEN' && r.origin === 'OWNER_NOTE'));
  const legacy = initialRows().filter(r => !r.id.startsWith('audit-'));
  assert.deepEqual(addMissingPublicSurfaceRows(addMissingPublicSurfaceRows(legacy)), initialRows());
  const task = publicSurfaceResearchTask('audit-p0-03');
  assert.equal(task.schema, 'CAPITAL_AI_OFFLINE_RESEARCH@1');
  assert.equal(task.domain, 'TRUST');
  assert.ok(task.query.length <= 300);
  assert.throws(() => publicSurfaceResearchTask('ga4'));
});

test('GSC direct owner report preserves source, import downgrade and missing versus zero',()=>{
  const gsc=initialRows().find(r=>r.id==='gsc')!;
  const report={schema:'CAPITAL_AI_GROWTH_GSC_READBACK@1',source:'GSC_SEARCH_ANALYTICS_API',private:true,readOnly:true,
    publicPublishAllowed:false,attributionAuthority:'SEPARATE_FROM_GA4_UMAMI_SOCIAL',property:'sc-domain:capital-ai.online',
    observedAt:at,status:'PROVIDER_READ_VERIFIED',transport:'READ_RESPONSE_RECEIVED',period:{startDate:'2026-11-14',endDate:'2026-11-20'},
    metrics:{clicks:0,impressions:10,ctr:0,position:5},evidenceSha256:'a'.repeat(64)};
  const projected=projectGsc(report,gsc);
  assert.equal(projected.status,'VERIFIED');assert.equal(projected.origin,'GSC_READBACK');
  assert.equal(importWorkspace(exportWorkspace(appendSnapshot([],[projected],at)))[0].rows[0].status,'NOT_PROVEN');
  assert.equal(projectGsc({...report,status:'NOT_PROVEN',transport:'AUTH_REQUIRED',period:null,metrics:null,evidenceSha256:null},gsc).status,'NOT_PROVEN');
  for(const v of [{...report,property:'sc-domain:other.example'},{...report,publicPublishAllowed:true},
    {...report,metrics:{...report.metrics,ctr:0.8}},{...report,evidenceSha256:null}])assert.throws(()=>projectGsc(v,gsc));
  assert.throws(()=>projectGsc(report,row));
});

test('X acquisition inventory exposes only planning and never promotes missing conversions or budgets',()=>{
  const rows=initialRows().filter(r=>r.id.startsWith('x-growth-'));
  assert.deepEqual(rows.map(r=>r.id),['x-growth-budget','x-growth-attribution','x-growth-graph']);
  assert.ok(rows.every(r=>r.origin==='OWNER_NOTE'&&r.status==='NOT_PROVEN'&&r.evidence===''));
  assert.deepEqual(importWorkspace(exportWorkspace(appendSnapshot([],rows,at)))[0].rows,rows);
  assert.match(rows[0].flow,/20 EUR/);
  assert.match(rows[1].next,/GA4-, Supabase- und Stripe/);
});

test('X campaign source remains separate from total GA4 and missing commerce evidence',async()=>{
  const {projectXCampaignGa4,makeRow}=await import('./growthOwnerWorkspaceModel');
  const x=makeRow('x-campaign','X Growth','GROWTH');
  const raw={schema:'CAPITAL_AI_X_CAMPAIGN_GA4_READBACK@1',source:'GA4_DATA_API',
    private:true,readOnly:true,publicPublishAllowed:false,observedAt:at,
    period:{start:'7daysAgo',end:'yesterday',timeZone:'Europe/Berlin'},
    campaignId:'capital-ai-growth-20261120',contentId:'CAP-GROW-005',utmSource:'x',utmMedium:'social',
    attributionAuthority:'SESSION_UTM_ONLY',status:'PROVIDER_READ_VERIFIED',
    metrics:{sessions:10,engagedSessions:3},registrations:null,paidSubscriptions:null};
  const projected=projectXCampaignGa4(raw,x);
  assert.equal(projected.status,'VERIFIED');
  assert.match(projected.evidence,/10 Sessions/);
  assert.equal(projectXCampaignGa4({...raw,status:'NOT_PROVEN_NO_ROWS',metrics:null},x).status,'NOT_PROVEN');
  for(const wrong of [{...raw,campaignId:'other'},{...raw,paidSubscriptions:1},{...raw,registrations:0},
    {...raw,metrics:{sessions:1,engagedSessions:2}},{...raw,publicPublishAllowed:true}])
    assert.throws(()=>projectXCampaignGa4(wrong,x));
  assert.throws(()=>projectXCampaignGa4(raw,row));
  assert.equal(importWorkspace(exportWorkspace(appendSnapshot([],[projected],at)))[0].rows[0].status,'NOT_PROVEN');
});

 test('CAI-664 billing task is offline, zero-budget and not live evidence',async()=>{const {billingRecoveryResearchTask}=await import('./growthOwnerWorkspaceModel');const row=initialRows().find(r=>r.id==='cai664-billing');assert.equal(row?.status,'NOT_PROVEN');assert.match(row?.approvals??'',/0 EUR/);const task=billingRecoveryResearchTask();assert.equal(task.schema,'CAPITAL_AI_OFFLINE_RESEARCH@1');assert.equal(task.domain,'TRUST');assert.ok(task.query.length<=300);});

test('Smartcopy conversion graph import keeps candidate and live metrics separate, no forged authority',()=>{
 const r={contractVersion:'CAPITAL_AI_SMARTCOPY_CONVERSION_GRAPH_HANDOFF@1',engine:'langgraph',productId:'ai-smartcopy',quality:'PASS_WITH_GAPS',nextAction:'VERIFY_SOURCE_AND_COHORT',providerAuthentication:'NOT_PROVEN_BY_GRAPH',verifiedMetrics:{paidLicenses:null,revenueCents:null,refunds:null},publicationAllowed:false,costActivationAllowed:false,automaticChanges:false};
 const live=[projectGa4(good,row),...initialRows().slice(1)],projected=projectGraphHandoff(JSON.stringify(r),reportSha,live);
 assert.deepEqual(projected.slice(0,live.length),live);assert.equal(projected.at(-1)?.status,'NOT_PROVEN');
 assert.equal(projectGraphHandoff(JSON.stringify(r),reportSha,projected).length,projected.length);
 for(const patch of [{productId:'smartclip'},{verifiedMetrics:{paidLicenses:0,revenueCents:null,refunds:null}},{publicationAllowed:true},{nextAction:'REPAIR_INPUT'},{candidatePayments:1}])assert.throws(()=>projectGraphHandoff(JSON.stringify({...r,...patch}),reportSha,live));
});

 test('hygiene and research handoff preserve live rows and archive as documentation only',()=>{
  const d='b'.repeat(64), thread='offline-'+'c'.repeat(40);
  const hygiene={contractVersion:'CAPITAL_AI_HYGIENE_HANDOFF@1',threadId:thread,runId:'hygiene-'+d,sourceSha:'e'.repeat(40),observedAt:at,scopeDigest:d,sourceDigest:d,contentDigest:d,methodId:'doc-drift-claims-v1',checked:4,affected:1,missing:0,score:75,coverage:15,status:'NOT_PROVEN',authorityGranted:false};
  const research={contractVersion:'CAPITAL_AI_RESEARCH_EVIDENCE_HANDOFF@1',threadId:thread,domain:'PLATFORM',bundleSha256:d,profileSha256:d,citationDigests:[d],sourceCount:1,status:'SOURCE_READBACK_MATCH',authorityGranted:false};
  const live=[projectGa4(good,row)];
  const first=projectGraphHandoff(JSON.stringify(hygiene),reportSha,live);
  assert.deepEqual(first[0],live[0]);assert.equal(first[1].status,'NOT_PROVEN');
  assert.strictEqual(projectGraphHandoff(JSON.stringify(hygiene),reportSha,first),first);
  const next=projectGraphHandoff(JSON.stringify(research),reportSha,first);
  assert.equal(next[1].dependencies,next[2].dependencies);assert.equal(next[2].status,'NOT_PROVEN');
  assert.deepEqual(importWorkspace(exportWorkspace(appendSnapshot([],next,at)))[0].rows.slice(1),next.slice(1));
  for(const patch of [{authorityGranted:true},{score:100},{coverage:100},{affected:5},{threadId:'raw private task'},{status:'VERIFIED'},{rawPrompt:'test'}])assert.throws(()=>projectGraphHandoff(JSON.stringify({...hygiene,...patch}),reportSha,live));
  for(const patch of [{authorityGranted:true},{citationDigests:[]},{sourceCount:0},{status:'VERIFIED'},{excerpt:'test'},{domain:'ROOT'}])assert.throws(()=>projectGraphHandoff(JSON.stringify({...research,...patch}),reportSha,live));
});
