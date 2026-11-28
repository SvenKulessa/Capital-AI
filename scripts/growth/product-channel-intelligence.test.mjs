import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {projectMarketplaceCatalog,planMarketplaceDraft,buildProductChannelGraphHandoff,buildProductChannelIntelligence,parseProductRegistry,projectProductChannels,PRODUCT_REGISTRY_PATH} from './product-channel-intelligence.mjs';
const sample=(...ids)=>'| Product | State | Readiness | Gap | Blocker |\n|---|---|---|---|---|\n'+ids.map(id=>'| [CAPITAL-AI-PRODUCT]'+id+' | PLANNED | — | — | ignore raw content |').join('\n');
test('actual registry is source-bound, deterministic and not a runtime or sales grant',()=>{const a=buildProductChannelIntelligence();assert.deepEqual(a,buildProductChannelIntelligence());assert.equal(a.sourceSha256,createHash('sha256').update(readFileSync(new URL('../../'+PRODUCT_REGISTRY_PATH,import.meta.url))).digest('hex'));assert.ok(a.products.length>3);assert.equal(a.publicPublishAllowed,false);assert.equal(a.liveSalesAllowed,false);assert.equal(a.providerCalls,0);assert.equal(a.campaignSpend,0);});
test('mobile, CADS and learning have distinct recommendations',()=>{const a=projectProductChannels(sample('CADS-BENCHMARK-ENGINE','LEARNING-PORTAL'));assert.equal(a.products.find(x=>x.id==='ai-smartcopy').channels[0].id,'acode');assert.equal(a.products.find(x=>x.id==='cads-benchmark-engine').channels[0].id,'githubMarketplace');assert.equal(a.products.find(x=>x.id==='learning-portal').channels[0].id,'website');assert.notEqual(a.products.find(x=>x.id==='smartclip').id,'ai-smartcopy');});
test('new unmapped repo product queues research instead of invented channels or metrics',()=>{const a=projectProductChannels(sample('NEW-PRODUCT'));const p=a.products[0];assert.equal(p.researchStatus,'UNMAPPED_RESEARCH_REQUIRED');assert.deepEqual(p.channels,[]);assert.equal(p.currentCommercialReadiness,'NOT_PROVEN');assert.doesNotMatch(JSON.stringify(a),/ignore raw content/);});
test('duplicate, malformed or empty registry fails closed',()=>{assert.throws(()=>parseProductRegistry(sample('DUP','DUP')));assert.throws(()=>parseProductRegistry(sample('INVALID<id>')));assert.throws(()=>parseProductRegistry(''));});
test('channel policy and permission boundary are never promoted; HN is human-only',()=>{const a=projectProductChannels(sample('CADS-BENCHMARK-ENGINE'));for(const p of a.products)for(const c of p.channels){assert.equal(c.automaticPublishAllowed,false);assert.equal(c.paidActivationAllowed,false);assert.equal(c.externalPurchaseLinkInPluginAllowed,false);assert.equal(c.reviewRequired,true);assert.deepEqual(c.metrics,{reach:null,visits:null,conversions:null,revenue:null});}assert.equal(a.products.find(p=>p.id==='ai-smartcopy').channels.find(c=>c.id==='showHN').rule,'HUMAN_ONLY_NO_GENERATED_TEXT');});

test('source-reviewed blueprint and agent candidates stay distinct and carry reference blobs',()=>{const a=buildProductChannelIntelligence();for(const id of ['digital-blueprints','solo2-rag','loop-agent']){const p=a.products.find(x=>x.id===id);assert.equal(p.profile,'engineering');assert.ok(p.sourceRefs.every(s=>/^[a-f0-9]{40}$/.test(s.blobSha)));assert.equal(p.currentCommercialReadiness,'NOT_PROVEN');assert.ok(p.channels.some(c=>c.id==='linkedin'));}const mobile=a.products.find(x=>x.id==='ai-smartcopy');assert.equal(mobile.channels.find(c=>c.id==='tiktok').rule,'COMMERCIAL_DISCLOSURE_REQUIRED');});

test('reference-only graph handoff has deterministic identity and no grants, raw content or metrics',()=>{
  const p=buildProductChannelGraphHandoff();
  assert.deepEqual(p,buildProductChannelGraphHandoff());
  assert.equal(p.publicPublishAllowed,false);
  assert.equal(p.liveSalesAllowed,false);
  assert.equal(p.providerCalls,0);
  assert.equal(p.campaignSpend,0);
  assert.ok(p.products.some(x=>x.id==='ai-smartcopy'&&x.channels.some(c=>c.id==='acode')));
  assert.ok(p.products.every(x=>Object.keys(x).sort().join(',')==='channels,id,researchStatus'&&x.channels.every(c=>Object.keys(c).sort().join(',')==='id,priority,rule')));
});


test('marketplace candidates expose official documentation but never grant publishing or spend',()=>{const a=projectProductChannels(sample('SAAS-MEMBERSHIP','LEARNING-PORTAL','HERO-BUDDY-SUPPORT'));const saas=a.products.find(p=>p.id==='saas-membership');assert.equal(saas.channels.find(c=>c.id==='microsoftMarketplace').automation,'API_SUBMISSION_DOCUMENTED');assert.equal(saas.channels.find(c=>c.id==='awsMarketplace').automation,'API_SUBMISSION_DOCUMENTED');assert.equal(saas.channels.find(c=>c.id==='googleCloudMarketplace').automation,'PORTAL_REVIEW');const learning=a.products.find(p=>p.id==='learning-portal');assert.equal(learning.channels.find(c=>c.id==='gumroad').automation,'MCP_DRAFT_AND_PUBLISH_DOCUMENTED');for(const p of a.products)for(const c of p.channels){assert.equal(new URL(c.source).protocol,'https:');assert.equal(c.accountAdmission,'NOT_PROVEN');assert.equal(c.costAdmission,'NOT_PROVEN');assert.equal(c.automaticPublishAllowed,false);assert.equal(c.paidActivationAllowed,false);}});


test('marketplace catalog is prioritized and digest-bound; draft keys are idempotent and reject authority injection',()=>{
 const c=projectMarketplaceCatalog(buildProductChannelIntelligence());
 assert.deepEqual(c,projectMarketplaceCatalog(buildProductChannelIntelligence()));
 assert.deepEqual(c.rows.slice(0,5).map(x=>x.id),['stripeDirect','gumroad','githubMarketplace','microsoftMarketplace','awsMarketplace']);
 const row=c.rows.find(x=>x.id==='stripeDirect');const input={catalogSha256:c.catalogSha256,channelId:row.id,productId:row.products[0]};
 const a=planMarketplaceDraft(input);assert.deepEqual(a,planMarketplaceDraft(input));assert.match(a.draftKey,/^[a-f0-9]{64}$/);
 assert.equal(a.price,null);assert.equal(a.publicationAllowed,false);assert.equal(a.providerCalls,0);assert.equal(a.spendCents,0);
 for(const bad of [{...input,catalogSha256:'0'.repeat(64)},{...input,productId:'unmapped'},{...input,publicationAllowed:true},{...input,price:1}])assert.throws(()=>planMarketplaceDraft(bad));
 assert.throws(()=>projectMarketplaceCatalog({...buildProductChannelIntelligence(),providerCalls:1}));
});
