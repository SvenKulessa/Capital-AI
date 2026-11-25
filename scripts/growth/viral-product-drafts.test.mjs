import test from 'node:test';
import assert from 'node:assert/strict';
import { socialTrendRecordSha256 } from './social-trend-projection.mjs';
import { createViralProductEngine, viralRecordDigest } from './viral-product-drafts.mjs';
import { createViralTemplateDiskCache } from './viral-template-cache.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const asOf='2026-11-24T12:00:00.000Z';
function fixture(){
 const records=Array.from({length:31},(_,i)=>({platform:'X',postId:String(i+1),sourceUrl:'https://x.com/example/status/'+(i+1),publishedAt:'2026-11-22T12:00:00.000Z',observedAt:asOf,views:i===30?300:100,metric:'views',niche:'fintech',format:'post',accountBand:'small'}));
 const digests=records.map(r=>socialTrendRecordSha256(r,asOf));
 const editorialSignals=[{recordSha256:digests[30],keywords:['chartanalyse','risiko'],audience:'beginner',intent:'learn',hookSummary:'So geht die Anleitung'}];
 const engagementRecords=digests.map((recordSha256,i)=>({recordSha256,interactions:i===30?90:10,metricDefinition:'likes_comments'}));
 const productContexts=[{id:'learning',sourceSha:'a'.repeat(40),name:'Learning Hub',topic:'Chartanalyse',benefit:'Finanzbildung verständlich erklärt.',walkthrough:'Chartgrundlagen öffnen.',url:'https://capital-ai.online/learning',keywords:['chartanalyse','risiko'],audienceId:'beginner',intent:'learn'}];
 const grant=(r,kind)=>({sha256:viralRecordDigest(r,kind),evidenceRef:'synthetic-fixture'});
 return {records,options:{asOf,trustedAnalyticsGrants:digests.map(recordSha256=>({recordSha256,analyticsAllowed:true,evidenceRef:'synthetic-fixture'})),editorialSignals,engagementRecords,productContexts,trustedEditorialGrants:editorialSignals.map(r=>grant(r,'signal')),trustedEngagementGrants:engagementRecords.map(r=>grant(r,'engagement')),trustedProductGrants:productContexts.map(r=>grant(r,'product'))}};
}
test('offline selected opportunity has four draft formats and no publication authority',()=>{
 const f=fixture(), build=createViralProductEngine(), result=build(f.records,f.options), item=result.selectedOpportunities[0];
 assert.equal(result.selectedOpportunities.length,1);assert.equal(item.correlationScore,100);assert.equal(item.pattern,'TUTORIAL');assert.equal(item.trigger,'KNOWLEDGE_GAP');assert.match(item.productBridgeLogic,/Chartanalyse/);assert.equal(item.metricEvidence.engagementPeerCount,30);
 assert.equal(item.generatedAssets.short_form_video.duration_sec,60);assert.equal(item.generatedAssets.instagram_carousel.slides.length,6);assert.equal(result.providerCalls,0);assert.equal(result.publicPublishAllowed,false);assert.equal(result.publicationState,'DRAFT_ONLY');assert.equal(result.providerAuthentication,'NOT_PROVEN');
 assert.doesNotMatch(JSON.stringify(result),/So geht die Anleitung/);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
});
test('missing, altered or duplicate independent grants and insufficient peers fail closed',()=>{
 for(const field of ['trustedEditorialGrants','trustedProductGrants','trustedEngagementGrants','trustedAnalyticsGrants']){
  const f=fixture();f.options[field]=[];assert.equal(createViralProductEngine()(f.records,f.options).selectedOpportunities.length,0);
 }
 const f=fixture();f.options.engagementRecords[30].interactions=300;assert.equal(createViralProductEngine()(f.records,f.options).selectedOpportunities.length,0);
 const g=fixture();g.options.trustedEditorialGrants.push(g.options.trustedEditorialGrants[0]);assert.equal(createViralProductEngine()(g.records,g.options).selectedOpportunities.length,0);
 const h=fixture();h.options.engagementRecords.pop();assert.equal(createViralProductEngine()(h.records,h.options).selectedOpportunities.length,0);
});
test('cache is isolated, defensive and invalidated by expiry and rights revocation',()=>{
 const f=fixture();let now=1;const build=createViralProductEngine({clock:()=>now});
 const a=build(f.records,f.options);a.selectedOpportunities[0].generatedAssets.x_post.hook='tampered';
 const b=build(f.records,f.options);assert.equal(b.cacheHits,1);assert.notEqual(b.selectedOpportunities[0].generatedAssets.x_post.hook,'tampered');
 now+=600001;assert.equal(build(f.records,f.options).cacheHits,0);
 assert.equal(build(f.records,{...f.options,trustedProductGrants:[]}).selectedOpportunities.length,0);
 assert.equal(createViralProductEngine()(f.records,f.options).cacheHits,0);
});
test('unsupported topic and unclassified hooks do not pass score gate',()=>{
 const f=fixture();f.options.editorialSignals[0].keywords=['unrelated'];f.options.trustedEditorialGrants[0].sha256=viralRecordDigest(f.options.editorialSignals[0],'signal');
 assert.equal(createViralProductEngine()(f.records,f.options).selectedOpportunities.length,0);
 const g=fixture();g.options.editorialSignals[0].hookSummary='Unbekanntes Muster';g.options.trustedEditorialGrants[0].sha256=viralRecordDigest(g.options.editorialSignals[0],'signal');
 assert.equal(createViralProductEngine()(g.records,g.options).selectedOpportunities.length,0);
});

test('optional disk cache reuses authenticated templates across instances and rights changes invalidate',()=>{
 const root=mkdtempSync(join(tmpdir(),'viral-engine-cache-'));try{
  const f=fixture(), config={root,ownerId:'12345678-1234-4234-8234-123456789abc',keyHex:'b'.repeat(64)};
  const build=()=>createViralProductEngine({clock:()=>100,persistentCache:createViralTemplateDiskCache(config)});
  assert.equal(build()(f.records,f.options).diskCacheHits,0);assert.equal(build()(f.records,f.options).diskCacheHits,1);
  f.options.trustedEditorialGrants[0].evidenceRef='new-synthetic-evidence';assert.equal(build()(f.records,f.options).diskCacheHits,0);
  assert.equal(build()(f.records,{...f.options,trustedEditorialGrants:[]}).selectedOpportunities.length,0);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('weighted X length and ambiguous product ties do not produce drafts',()=>{
 const f=fixture(),p=f.options.productContexts[0];p.name='漢'.repeat(40);p.benefit='漢'.repeat(85);f.options.trustedProductGrants[0].sha256=viralRecordDigest(p,'product');
 assert.equal(createViralProductEngine()(f.records,f.options).selectedOpportunities.length,0);
 const g=fixture(),other={...g.options.productContexts[0],id:'other'};g.options.productContexts.push(other);g.options.trustedProductGrants.push({sha256:viralRecordDigest(other,'product'),evidenceRef:'synthetic-fixture'});
 assert.equal(createViralProductEngine()(g.records,g.options).selectedOpportunities.length,0);
});
