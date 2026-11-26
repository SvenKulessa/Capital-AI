import test from 'node:test';import assert from 'node:assert/strict';
import {researchDigest,buildResearchRound,buildSmartcopyPilot} from './product-market-research.mjs';
const plan={contractVersion:'CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1',sourceSha256:'a'.repeat(64),publicPublishAllowed:false,liveSalesAllowed:false,providerCalls:0,campaignSpend:0,products:[{id:'ai-smartcopy',channels:[{id:'website',rule:'REVIEW_REQUIRED'},{id:'youtube',rule:'REVIEW_REQUIRED'},{id:'showHN',rule:'HUMAN_ONLY_NO_GENERATED_TEXT'}]},{id:'new-product',channels:[]}]};
const a={productId:'ai-smartcopy',kind:'PLATFORM_RULE',entityId:'acode',sourceUrl:'https://docs.acode.app/docs/getting-started/publish-from-ci',observedOn:'2026-11-25',summary:'Official documentation describes CI publishing; no publication permission inferred.'};
const b={...a,kind:'COMPETITOR',entityId:'termux-api',sourceUrl:'https://f-droid.org/packages/com.termux.api/',summary:'Clipboard from shell scripts in Termux.'};
const grants=records=>records.map(r=>({digest:researchDigest(r),reviewRef:'operator-reviewed-source'}));
const input=(records=[a,b],reviewGrants=grants(records))=>({asOf:'2026-11-25',records,reviewGrants});
const round=(records=[a,b],reviewGrants=grants(records))=>buildResearchRound(plan,input(records,reviewGrants));
const deps={planContentCampaign:campaign=>({campaign,publication:{publicPublishAllowed:false}}),buildDraftContentSocialPackage:input=>({...input,approvals:[],deliveries:[]})};
test('reviewed sources and automatic research queue for new products',()=>{const r=round();assert.equal(r.accepted.length,2);assert.equal(r.products[1].status,'RESEARCH_REQUIRED');assert.equal(r.products[1].metrics.revenue,null);assert.deepEqual(r,round());});
test('unreviewed record and changed digest are excluded',()=>{assert.equal(round([a,b],[]).accepted.length,0);assert.equal(round([{...a,summary:'changed'}],grants([a])).accepted.length,0);});
test('stale and future dates excluded',()=>{assert.equal(round([{...a,observedOn:'2026-10-01'}]).accepted.length,0);assert.equal(round([{...a,observedOn:'2026-11-26'}]).accepted.length,0);});
test('duplicate record and duplicate grant denied',()=>{assert.throws(()=>round([a,a],grants([a])));assert.throws(()=>round([a],[...grants([a]),...grants([a])]));});
test('source URL and self-grants rejected',()=>{assert.throws(()=>researchDigest({...a,sourceUrl:'http://localhost/'}));assert.throws(()=>researchDigest({...a,sourceUrl:'https://user:pass@docs.acode.app/'}));assert.throws(()=>researchDigest({...a,publicPublishAllowed:true}));});
test('unknown product cannot enter reviewed scope',()=>{assert.equal(round([{...a,productId:'foreign-product'}]).accepted.length,0);});
test('pilot uses existing contract interfaces and separates human-only channel',()=>{const r=buildSmartcopyPilot(plan,input(),deps);assert.equal(r.drafts.length,2);assert.equal(r.manualChannelPreparation[0].id,'showHN');assert.equal(r.conversionPlan.metrics.paidLicenses,null);assert.ok(r.drafts.every(d=>d.socialPackage.approvals.length===0));assert.equal(r.publicPublishAllowed,false);});
test('no content handoff without research and authority boundaries',()=>{assert.throws(()=>buildSmartcopyPilot(plan,input([a]),deps));assert.throws(()=>buildSmartcopyPilot(plan,input(),{...deps,planContentCampaign:()=>({publication:{publicPublishAllowed:true}})}));assert.throws(()=>buildSmartcopyPilot(plan,input(),{...deps,buildDraftContentSocialPackage:()=>({approvals:[{}],deliveries:[]})}));});

test('forged projected research cannot replace original input',()=>{assert.throws(()=>buildSmartcopyPilot(plan,round(),deps));assert.throws(()=>researchDigest({...a,productId:['ai-smartcopy']}));});

import {reconcileSmartcopyConversionCandidates} from './product-market-research.mjs';
const cd=x=>x.repeat(64), scope={campaignId:'smartcopy-'+'a'.repeat(24),releaseSha256:cd('b')};
function conversionFixture(){
 const common={productId:'ai-smartcopy',...scope,subjectKey:cd('c')};
 return {asOf:'2026-11-25T12:00:00.000Z',start:'2026-11-24T00:00:00.000Z',end:'2026-11-25T00:00:00.000Z',
 consents:[{...common,receiptSha256:cd('d'),source:'SERVER_CONSENT_LEDGER',purpose:'PRODUCT_CONVERSION',grantedAt:'2026-11-24T01:00:00.000Z',expiresAt:'2026-12-24T01:00:00.000Z',revokedAt:null}],
 payments:[{...common,receiptSha256:cd('e'),source:'STRIPE_ONE_TIME_RECEIPT',consentSha256:cd('d'),chargeKey:cd('f'),billing:'one_time',live:true,currency:'EUR',paidAt:'2026-11-24T10:00:00.000Z',observedAt:'2026-11-25T11:00:00.000Z',paidCents:499,refundedCents:0,disputed:false,licenseState:'GRANTED'}]};
}
test('one-time consent-bound candidates never become verified metrics or leak pseudonyms',()=>{
 const r=reconcileSmartcopyConversionCandidates(conversionFixture(),scope);
 assert.equal(r.candidatePayments,1);assert.equal(r.candidateActiveLicenses,1);assert.equal(r.candidateNetPaidCents,499);
 assert.deepEqual(r.verifiedMetrics,{paidLicenses:null,revenueCents:null,refunds:null});
 assert.doesNotMatch(JSON.stringify(r),new RegExp(cd('c')));assert.equal(r.automaticChanges,false);
});
test('partial refund, terminal full refund and dispute produce distinct candidates',()=>{
 for(const [refund,disputed,state,active,net] of [[100,false,'GRANTED',1,399],[499,false,'REVOKED',0,0],[0,true,'REVOKED',0,0]]){
 const v=conversionFixture();Object.assign(v.payments[0],{refundedCents:refund,disputed,licenseState:state});
 const r=reconcileSmartcopyConversionCandidates(v,scope);assert.equal(r.candidateActiveLicenses,active);assert.equal(r.candidateNetPaidCents,net);
 }
});
test('withdrawal and empty candidate cohort remain null, never zero actual sales',()=>{
 const v=conversionFixture();v.consents[0].revokedAt='2026-11-25T01:00:00.000Z';
 assert.equal(reconcileSmartcopyConversionCandidates(v,scope).candidatePayments,null);
 const empty=conversionFixture();empty.payments=[];assert.equal(reconcileSmartcopyConversionCandidates(empty,scope).candidateNetPaidCents,null);
});
test('subscription, duplicate, cross-campaign, wrong release, stale readback and unreversed refund denied',()=>{
 for(const patch of [{billing:'subscription'},{campaignId:'smartcopy-'+'b'.repeat(24)},{releaseSha256:cd('a')},{observedAt:'2026-11-24T11:00:00.000Z'},{refundedCents:499},{live:false},{clipboard:'secret'}]){
 const v=conversionFixture();Object.assign(v.payments[0],patch);assert.throws(()=>reconcileSmartcopyConversionCandidates(v,scope));
 }
 const v=conversionFixture();v.payments.push({...v.payments[0]});assert.throws(()=>reconcileSmartcopyConversionCandidates(v,scope));
});
