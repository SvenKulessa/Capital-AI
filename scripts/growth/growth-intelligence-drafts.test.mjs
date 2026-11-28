import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  GROWTH_INTELLIGENCE_PLAN_PATH,
  buildGrowthIntelligenceDraftBundle,
  projectGrowthDataLayer,
  collectGrowthProviderData,
  createGrowthProviderReaders,
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

test('live collectors default deny and do not alter the offline draft bundle',async()=>{
  const result=await collectGrowthProviderData({env:{},now:()=>Date.parse(asOf),
    fetchImpl:()=>{throw Error('unexpected provider call')},readGa4:()=>{throw Error('unexpected GA4')}});
  assert.equal(result.contractVersion,'CAPITAL_AI_GROWTH_PROVIDER_READ@1');
  assert.ok(result.transport.every(x=>x.status==='DISABLED'));
  assert.equal(result.draftBundle.publicPublishAllowed,false);
  assert.deepEqual(result.draftBundle.drafts,buildGrowthIntelligenceDraftBundle().drafts);
});
const fakeToken='synthetic-test-token';
const jsonResponse=(obj,status=200)=>new Response(JSON.stringify(obj),{status});
test('GSC uses fixed property, final read-only POST and weighted position; no credentials in projection',async()=>{
  const calls=[];
  const readers=createGrowthProviderReaders({fetchImpl:async(url,options)=>{
    calls.push({url,options});
    if(calls.length===1)return jsonResponse({siteUrl:'sc-domain:capital-ai.online',permissionLevel:'siteOwner'});
    return jsonResponse({rows:[{keys:['2026-11-17'],clicks:1,impressions:10,position:3},{keys:['2026-11-18'],clicks:2,impressions:20,position:6}]});
  }});
  const result=await readers.GSC({identity:'sc-domain:capital-ai.online',token:fakeToken,startDate:'2026-11-17',endDate:'2026-11-18'});
  assert.deepEqual(result,{rows:[{clicks:3,impressions:30,ctr:0.1,position:5}]});
  assert.equal(calls[1].options.method,'POST');
  assert.equal(calls[1].options.redirect,'error');
  assert.equal(JSON.parse(calls[1].options.body).dataState,'final');
  assert.ok(calls.every(c=>!c.url.includes(fakeToken)));
  assert.doesNotMatch(JSON.stringify(result),/synthetic-test-token/);
});
test('provider errors remain isolated; missing days do not become a measured zero',async()=>{
  const result=await collectGrowthProviderData({env:{
    GROWTH_GSC_READ_ENABLED:'true',GROWTH_GSC_READ_TOKEN:fakeToken,
    GROWTH_INSTAGRAM_READ_ENABLED:'true',GROWTH_INSTAGRAM_ACCOUNT_ID:'1234',
    GROWTH_INSTAGRAM_READ_TOKEN:fakeToken,SOCIAL_META_GRAPH_API_VERSION:'v27.0',
    GROWTH_YOUTUBE_READ_ENABLED:'true',GROWTH_YOUTUBE_CHANNEL_ID:identities.YOUTUBE,
    GROWTH_YOUTUBE_READ_TOKEN:fakeToken,
  },now:()=>Date.parse(asOf),fetchImpl:async(url)=>{
    const endpoint=new URL(url);
    if(endpoint.origin==='https://www.googleapis.com')return jsonResponse({error:'private-secret'},403);
    if(endpoint.origin==='https://graph.facebook.com'&&endpoint.searchParams.get('fields')==='id')return jsonResponse({id:'1234'});
    if(endpoint.origin==='https://graph.facebook.com')return jsonResponse({data:[
      {name:'reach',period:'day',total_value:{value:15}},
      {name:'accounts_engaged',period:'day',total_value:{value:2}}]});
    return jsonResponse({columnHeaders:[{name:'day'},{name:'views'},{name:'estimatedMinutesWatched'}],rows:[['2026-11-20',1,2]]});
  }});
  assert.deepEqual(result.transport.map(x=>x.status),['DISABLED','AUTH_REQUIRED','READ_RESPONSE_RECEIVED','INCOMPLETE_PERIOD']);
  assert.deepEqual(result.growthDataLayer.sources[2].metrics,{reach:15,accounts_engaged:2});
  assert.equal(result.growthDataLayer.sources[3].metrics,null);
  assert.doesNotMatch(JSON.stringify(result),/private-secret|synthetic-test-token/);
});
test('YouTube requires complete exact day rows and binds the channel in the request',async()=>{
  const readers=createGrowthProviderReaders({fetchImpl:async(url,options)=>{
    assert.equal(new URL(url).searchParams.get('ids'),'channel=='+identities.YOUTUBE);
    assert.equal(options.method,'GET');
    return jsonResponse({columnHeaders:[{name:'day'},{name:'views'},{name:'estimatedMinutesWatched'}],rows:[['2026-11-17',4,6],['2026-11-18',5,7]]});
  }});
  assert.deepEqual(await readers.YOUTUBE({identity:identities.YOUTUBE,token:fakeToken,startDate:'2026-11-17',endDate:'2026-11-18'}),{
    columnHeaders:[{name:'views'},{name:'estimatedMinutesWatched'}],rows:[[9,13]]});
  await assert.rejects(()=>readers.YOUTUBE({identity:identities.YOUTUBE,token:fakeToken,startDate:'2020-01-01',endDate:'2026-11-18'}),/INVALID_RESPONSE/);
});
test('GA4 uses existing MCP reader with configured property and exact property-local dates',async()=>{
  const env={GROWTH_GA4_READ_ENABLED:'true',GOOGLE_ANALYTICS_PROPERTY_NUMBER:'123',
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON:'synthetic',GOOGLE_ANALYTICS_CLOUD_PROJECT:'synthetic'};
  const input={env,now:()=>Date.parse(asOf),readGa4:async()=>({status:'PROVIDER_READ_VERIFIED',
    source:'GA4_DATA_API',observedAt:asOf,property:{resourceName:'properties/123'},
    period:{start:'7daysAgo',end:'yesterday',timeZone:'Europe/Berlin'},metrics:{sessions:9,engagedSessions:3}})};
  const result=await collectGrowthProviderData(input);
  assert.equal(result.transport[0].status,'READ_RESPONSE_RECEIVED');
  assert.equal(result.growthDataLayer.sources[0].startDate,'2026-11-17');
  assert.equal(result.growthDataLayer.sources[0].endDate,'2026-11-23');
  const mismatch=await collectGrowthProviderData({...input,readGa4:async()=>({...await input.readGa4(),property:{resourceName:'properties/999'}})});
  assert.equal(mismatch.transport[0].status,'INVALID_RESPONSE');
});

test('graph-only handoff excludes draft bundle and retains independent disabled sources',async()=>{
  const result=await collectGrowthProviderData({env:{},now:()=>Date.parse(asOf),includeDraftBundle:false,
    fetchImpl:()=>{throw Error('unexpected provider call')},readGa4:()=>{throw Error('unexpected GA4')}});
  assert.deepEqual(Object.keys(result).sort(),['collectionMode','contractVersion','growthDataLayer','publicPublishAllowed','transport']);
  assert.ok(result.transport.every(x=>x.status==='DISABLED'));
  assert.ok(result.growthDataLayer.sources.every(x=>x.metrics===null));
  assert.equal(result.publicPublishAllowed,false);
  assert.deepEqual(result.growthDataLayer.attributionEvents,[]);
});

// Offline per-post trend projection; no provider or publication access.
import './social-trend-projection.test.mjs';
import './viral-product-drafts.test.mjs';
import './viral-content-engine.test.mjs';
import './viral-template-cache.test.mjs';

// Product-channel planning uses the existing Growth test entrypoint.
import './product-channel-intelligence.test.mjs';
test('existing Growth bundle carries deterministic product-channel plans without publishing rights',()=>{const a=buildGrowthIntelligenceDraftBundle();assert.equal(a.productToMarket.contractVersion,'CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1');assert.equal(a.productToMarket.publicPublishAllowed,false);assert.ok(a.productToMarket.products.some(p=>p.id==='ai-smartcopy'));});

import './product-market-research.test.mjs';
import {researchDigest} from './product-market-research.mjs';
import {runProductMarketResearch} from './growth-intelligence-drafts.mjs';
test('product research uses real Content Engine and Social package, never publishing or billing',()=>{
  const a={productId:'ai-smartcopy',kind:'PLATFORM_RULE',entityId:'acode',sourceUrl:'https://docs.acode.app/docs/getting-started/publish-from-ci',observedOn:'2026-11-25',summary:'Official docs describe CI publishing.'};
  const b={...a,kind:'COMPETITOR',entityId:'termux-api',sourceUrl:'https://f-droid.org/packages/com.termux.api/',summary:'Clipboard from shell scripts in Termux.'};
  const records=[a,b],ledger={asOf:'2026-11-25',reviewGrants:records.map(r=>({digest:researchDigest(r),reviewRef:'synthetic-test-review'}))};
  const r=runProductMarketResearch({records},ledger);
  assert.ok(r.pilot.drafts.length>1);
  assert.ok(r.pilot.drafts.every(d=>d.contentPlan.cadsQuality.technicalStatus==='PASS'&&d.socialPackage.approvals.length===0&&d.socialPackage.deliveries.length===0));
  assert.ok(r.pilot.manualChannelPreparation.some(c=>c.id==='showHN'));
  assert.equal(r.pilot.conversionPlan.metrics.revenueCents,null);
  const validation=r.research.products.find(p=>p.productId==='ai-smartcopy').validation;
  assert.equal(validation.researchPlan.length,3);
  assert.equal(validation.decision.recommendation,'VALIDATE');
  assert.ok(validation.productApprovals.every(p=>p.researchGrantsApproval===false));
  assert.equal(runProductMarketResearch({records},{...ledger,reviewGrants:[]}).pilot,null);
  assert.throws(()=>runProductMarketResearch({records,reviewGrants:ledger.reviewGrants},ledger));
});

test('existing research entrypoint carries aggregate willingness to pay for registered products',()=>{
  const record={productId:'ai-smartcopy',kind:'WILLINGNESS_TO_PAY',entityId:'synthetic-survey',sourceUrl:'https://capital-ai.online/',observedOn:'2026-11-28',summary:'Synthetic integration fixture, no real respondents.',study:{studyId:'synthetic-price-study',segmentId:'mobile-developers',productVersion:'private-rc',method:'PRICE_SURVEY',recruitment:'Synthetic fixture',limitations:'Not market evidence',consentRef:'synthetic-consent',sampleSize:10,positiveResponses:2,priceCents:499,currency:'EUR',billing:'one_time'}};
  const result=runProductMarketResearch({records:[record]},{asOf:'2026-11-28',reviewGrants:[{digest:researchDigest(record),reviewRef:'synthetic-independent-review'}]});
  const v=result.research.products.find(p=>p.productId==='ai-smartcopy').validation;
  assert.equal(v.willingnessToPay.studies[0].positiveRate,0.2);
  assert.equal(v.willingnessToPay.validatedPriceCents,null);
  assert.equal(v.ownerApprovalReadback,'NOT_PROVEN_NOT_IMPORTED');
  assert.equal(result.pilot,null);assert.equal(result.publicPublishAllowed,false);
});

test('Growth visual plans cover the seven source-bound campaigns without creating or publishing media',()=>{
  const bundle=buildGrowthIntelligenceDraftBundle();
  assert.equal(bundle.visualIntelligence.plannedScenes,7);
  assert.equal(bundle.visualIntelligence.actualMediaAssets,0);
  for(const draft of bundle.drafts){const v=draft.visualScene;assert.ok(v);assert.equal(v.contentId,draft.contentId);assert.equal(v.publicationAllowed,false);assert.equal(v.dataMode,'SCHEMATIC');assert.equal(v.actualMediaAssets,0);assert.equal(v.sceneSha256,createHash('sha256').update(JSON.stringify({sourceSha:v.sourceSha,scene:v.scene})).digest('hex'));}
});

test('direct Instagram signs both fixed Meta GETs and rejects invalid app secret',async()=>{
  const secret='synthetic-app-secret';
  const {createHmac}=await import('node:crypto');
  const proof=createHmac('sha256',secret).update(fakeToken).digest('hex');
  let calls=0;
  const input={identity:'1234',token:fakeToken,appSecret:secret,version:'v27.0',startDate:'2026-11-17',endDate:'2026-11-18'};
  const readers=createGrowthProviderReaders({fetchImpl:async(url,options)=>{
    const target=new URL(url);
    assert.equal(target.origin,'https://graph.facebook.com');
    assert.equal(target.pathname,++calls===1?'/v27.0/1234':'/v27.0/1234/insights');
    assert.equal(target.searchParams.get('appsecret_proof'),proof);
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.Authorization,'Bearer '+fakeToken);
    assert.ok(!url.includes(secret)&&!url.includes(fakeToken));
    return calls===1?jsonResponse({id:'1234'}):jsonResponse({data:[
      {name:'reach',period:'day',total_value:{value:15}},
      {name:'accounts_engaged',period:'day',total_value:{value:2}}]});
  }});
  assert.deepEqual(await readers.INSTAGRAM(input),{reach:15,accounts_engaged:2});
  assert.equal(calls,2);
  await assert.rejects(()=>readers.INSTAGRAM({...input,appSecret:''}),/AUTH_REQUIRED/);
  assert.equal(calls,2);
});
test('direct Instagram Meta HTTP 400 errors are isolated and sanitized',async()=>{
  for(const [code,status] of [[190,'AUTH_REQUIRED'],[10,'AUTH_REQUIRED'],[200,'AUTH_REQUIRED'],[4,'RATE_LIMITED'],[100,'PROVIDER_UNAVAILABLE']]){
    const result=await collectGrowthProviderData({includeDraftBundle:false,env:{
      GROWTH_INSTAGRAM_READ_ENABLED:'true',GROWTH_INSTAGRAM_ACCOUNT_ID:'1234',
      GROWTH_INSTAGRAM_READ_TOKEN:fakeToken,GROWTH_INSTAGRAM_READ_APP_SECRET:'synthetic-app-secret',
      SOCIAL_META_GRAPH_API_VERSION:'v27.0',
    },now:()=>Date.parse(asOf),fetchImpl:async(url)=>{
      assert.match(url,/appsecret_proof=[a-f0-9]{64}/);
      return jsonResponse({error:{code,message:'private-provider-detail'}},400);
    }});
    assert.equal(result.transport.find(s=>s.source==='INSTAGRAM').status,status);
    assert.equal(result.growthDataLayer.sources.find(s=>s.source==='INSTAGRAM').metrics,null);
    assert.doesNotMatch(JSON.stringify(result),/private-provider-detail|synthetic-app-secret|synthetic-test-token/);
    assert.equal(result.publicPublishAllowed,false);
  }
});
