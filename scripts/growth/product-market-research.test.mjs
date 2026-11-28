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

// All studies below are synthetic fixtures, never measured market results.
const studyRecord=(kind='DEMAND_SIGNAL',patch={})=>({...a,kind,entityId:'synthetic-study',study:{studyId:kind.toLowerCase().replaceAll('_','-'),segmentId:'mobile-developers',productVersion:'private-rc-1',method:{DEMAND_SIGNAL:'PROBLEM_INTERVIEW',WILLINGNESS_TO_PAY:'PRICE_SURVEY',PRODUCT_ACCEPTANCE:'CONCEPT_TEST'}[kind],recruitment:'Synthetic convenience sample',limitations:'Selection bias; no population or causal inference',consentRef:'synthetic-consent-reference',sampleSize:20,positiveResponses:5,priceCents:kind==='WILLINGNESS_TO_PAY'?499:null,currency:kind==='WILLINGNESS_TO_PAY'?'EUR':null,billing:kind==='WILLINGNESS_TO_PAY'?'one_time':null,...patch}});
test('three research dimensions yield a review proposal, never product or sales approval',()=>{
  const records=['DEMAND_SIGNAL','WILLINGNESS_TO_PAY','PRODUCT_ACCEPTANCE'].map(k=>studyRecord(k));
  const v=round(records).products[0].validation;
  assert.equal(v.demand.studies[0].positiveRate,0.25);
  assert.equal(v.willingnessToPay.studies[0].priceCents,499);
  assert.equal(v.customerAcceptance.studies[0].method,'CONCEPT_TEST');
  assert.equal(v.decision.recommendation,'OWNER_REVIEW_REQUIRED');
  assert.ok(v.productApprovals.every(a=>a.status==='NOT_PROVEN'&&a.researchGrantsApproval===false));
  assert.equal(v.verifiedMetrics.purchaseConversionRate,null);assert.equal(v.liveSalesAllowed,false);
});
test('missing and zero-positive research stay distinct and never infer an optimal price',()=>{
  const v=round([studyRecord('WILLINGNESS_TO_PAY',{positiveResponses:0})]).products[0].validation;
  assert.equal(v.willingnessToPay.studies[0].positiveRate,0);assert.equal(v.willingnessToPay.validatedPriceCents,null);
  assert.equal(v.demand.status,'NOT_PROVEN');assert.equal(v.decision.recommendation,'VALIDATE');
  assert.deepEqual(round([]).products[1].validation.willingnessToPay.studies,[]);
});
test('text demand, competitor prices and old surveys cannot stand in for measured willingness',()=>{
  const v=round([a,b,{...a,kind:'DEMAND_SIGNAL'}]).products[0].validation;
  assert.equal(v.demand.signalCount,1);assert.equal(v.demand.studies.length,0);
  assert.equal(v.willingnessToPay.status,'NOT_PROVEN');
  assert.equal(round([{...studyRecord(),observedOn:'2026-10-01'}]).products[0].validation.demand.status,'NOT_PROVEN');
});
test('measurement bytes are reviewed and canonical, changed sample invalidates grant',()=>{
  const r=studyRecord();
  assert.equal(researchDigest(r),researchDigest({...r,study:Object.fromEntries(Object.entries(r.study).reverse())}));
  const changed={...r,study:{...r.study,sampleSize:21}};
  assert.equal(round([changed],grants([r])).accepted.length,0);
});
test('invalid study counts, price scope, methods, raw identities and self approval fail closed',()=>{
  for(const patch of [{sampleSize:0},{sampleSize:1.5},{positiveResponses:21},{positiveResponses:-1},{method:'CLICK'},{consentRef:''},{email:'person@example.com'},{approved:true},{priceCents:499}])assert.throws(()=>researchDigest(studyRecord('DEMAND_SIGNAL',patch)));
  for(const patch of [{priceCents:0},{priceCents:1.1},{currency:'USD'},{billing:'weekly'}])assert.throws(()=>researchDigest(studyRecord('WILLINGNESS_TO_PAY',patch)));
  assert.throws(()=>researchDigest({...a,kind:'WILLINGNESS_TO_PAY'}));
  assert.throws(()=>researchDigest({...a,study:studyRecord().study}));
});
test('same study cohort cannot be counted twice; segments and billing remain separate',()=>{
  const r=studyRecord('WILLINGNESS_TO_PAY');
  assert.throws(()=>round([r,{...r,entityId:'another-source'}]),/RESEARCH_STUDY_DUPLICATE/);
  const other={...r,study:{...r.study,segmentId:'enterprise-buyers',billing:'monthly'}};
  const rows=round([r,other]).products[0].validation.willingnessToPay.studies;
  assert.equal(rows.length,2);assert.equal(rows[0].billing,'one_time');assert.equal(rows[1].billing,'monthly');
});

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
