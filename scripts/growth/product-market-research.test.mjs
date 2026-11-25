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
