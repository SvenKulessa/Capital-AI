import test from 'node:test';
import assert from 'node:assert/strict';
import {createViralContentEngine,projectViralGraphHandoff,runViralOperatorInput,readViralJsonFile} from './viral-content-engine.mjs';
import {mkdtempSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialTrendRecordSha256} from './social-trend-projection.mjs';
import {viralRecordDigest} from './viral-product-drafts.mjs';
test('canonical content engine consumes a qualified synthetic candidate without approval',()=>{
 const asOf='2026-11-24T12:00:00.000Z';
 const rows=Array.from({length:31},(_,i)=>({platform:'X',postId:String(i+1),sourceUrl:'https://x.com/example/status/'+(i+1),publishedAt:'2026-11-22T12:00:00.000Z',observedAt:asOf,views:i===30?300:100,metric:'views',niche:'fintech',format:'post',accountBand:'small'}));
 const ids=rows.map(r=>socialTrendRecordSha256(r,asOf)), editorialSignals=[{recordSha256:ids[30],keywords:['chartanalyse'],audience:'beginner',intent:'learn',hookSummary:'So geht die Anleitung'}];
 const engagementRecords=ids.map((recordSha256,i)=>({recordSha256,interactions:i===30?90:10,metricDefinition:'likes_comments'}));
 const productContexts=[{id:'learning',sourceSha:'a'.repeat(40),name:'Learning Hub',topic:'Chartanalyse',benefit:'Finanzbildung verständlich erklärt.',walkthrough:'Chartgrundlagen öffnen.',url:'https://capital-ai.online/learning',keywords:['chartanalyse'],audienceId:'beginner',intent:'learn'}];
 const grant=(r,k)=>({sha256:viralRecordDigest(r,k),evidenceRef:'synthetic-fixture'});
 const report=createViralContentEngine()(rows,{asOf,trustedAnalyticsGrants:ids.map(recordSha256=>({recordSha256,analyticsAllowed:true,evidenceRef:'synthetic-fixture'})),editorialSignals,engagementRecords,productContexts,trustedEditorialGrants:editorialSignals.map(r=>grant(r,'signal')),trustedEngagementGrants:engagementRecords.map(r=>grant(r,'engagement')),trustedProductGrants:productContexts.map(r=>grant(r,'product'))});
 assert.equal(report.selectedOpportunities.length,1);
 const item=report.selectedOpportunities[0];
 assert.equal(item.contentPlan.publication.publicPublishAllowed,false);assert.deepEqual(item.socialPackage.approvals,[]);assert.deepEqual(item.socialPackage.deliveries,[]);assert.equal(item.tiktokDelivery,'INTEGRATION_PENDING');assert.equal(item.actualMediaAssets,0);
 const handoff=projectViralGraphHandoff(report);assert.equal(handoff.opportunities.length,1);assert.equal(handoff.opportunities[0].draftSha256,item.socialPackage.assets[0].sha256);assert.doesNotMatch(JSON.stringify(handoff),/Chartanalyse|synthetic-fixture/);assert.equal(handoff.publicPublishAllowed,false);
});

test('operator envelopes are separate and graph handoff never grants authority',()=>{
 const input={records:[],editorialSignals:[],engagementRecords:[]},ledger={asOf:'2026-11-24T12:00:00.000Z',trustedAnalyticsGrants:[],trustedEditorialGrants:[],trustedEngagementGrants:[],productContexts:[],trustedProductGrants:[]};
 const result=runViralOperatorInput(input,ledger);assert.equal(result.status,'NOT_PROVEN');assert.deepEqual(projectViralGraphHandoff(result).opportunities,[]);
 assert.throws(()=>runViralOperatorInput({...input,trustedProductGrants:[]},ledger),/ENVELOPE_INVALID/);
 assert.throws(()=>projectViralGraphHandoff({...result,publicPublishAllowed:true}),/INPUT_INVALID/);
});
test('bounded local ledger requires private file and refuses symlinks',()=>{
 const root=mkdtempSync(join(tmpdir(),'viral-ledger-'));try{
  const p=join(root,'ledger.json');writeFileSync(p,'{}',{mode:0o600});assert.deepEqual(readViralJsonFile(p,{ledger:true}),{});
  chmodSync(p,0o644);assert.throws(()=>readViralJsonFile(p,{ledger:true}),/FILE_REJECTED/);
  const link=join(root,'link');symlinkSync(p,link);assert.throws(()=>readViralJsonFile(link),/FILE_REJECTED/);
  writeFileSync(p,Buffer.alloc(2*1024*1024+1));assert.throws(()=>readViralJsonFile(p),/FILE_REJECTED/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
