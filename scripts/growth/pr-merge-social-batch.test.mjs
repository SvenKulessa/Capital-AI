import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertBatch,runBatch,renderDraftHtml,toolSuitability,readWorkerJson,
  BRAND_ASSET,BRAND_SHA256,
} from './pr-merge-social-batch.mjs';

const source=JSON.parse(readFileSync('src/data/controlCenterNews.json','utf8'));
const sha=source.sourceSha,last=source.lastBatchPr;
const opts={expectedLast:last,mergedSha:sha,env:{}};

test('handoff validates existing 20-merge milestone and blocks stale, tampered or publishable evidence',()=>{
  assert.equal(assertBatch(source,last,sha),source);
  assert.throws(()=>assertBatch(source,last+1,sha),/SOCIAL_BATCH_SOURCE_OR_AUTHORITY_INVALID/);
  assert.throws(()=>assertBatch(source,last,'a'.repeat(40)),/SOCIAL_BATCH_SOURCE_OR_AUTHORITY_INVALID/);
  for(const mutation of [
    x=>x.state='PUBLISHED', x=>x.socialMediaEngine.published=true,
    x=>x.contentEnginePlan.publication.publicPublishAllowed=true,
    x=>x.sourcePrs=x.sourcePrs.slice(1),x=>x.mergeCount=419,
    x=>x.sourcePrs[0].url='https://evil.example/pull/1',
    x=>x.sourcePrs[0].number=x.sourcePrs[1].number,
  ]){
    const x=structuredClone(source);mutation(x);
    assert.throws(()=>assertBatch(x,last,sha),/SOCIAL_BATCH_SOURCE_OR_AUTHORITY_INVALID/);
  }
});
test('real canonical watermark is digest-pinned and public-domain-facing but drafts remain unpublishable',async()=>{
  const {outcome,html}=await runBatch(source,opts);
  assert.equal(outcome.watermark.asset,BRAND_ASSET);
  assert.equal(outcome.watermark.sha256,BRAND_SHA256);
  assert.equal(outcome.watermark.opacity,0.09);
  assert.equal(outcome.manifest.assets[0].sha256,BRAND_SHA256);
  assert.deepEqual(outcome.manifest.approvals,[]);
  assert.deepEqual(outcome.manifest.deliveries,[]);
  assert.equal(outcome.manifest.publicationAuthority,'SOCIAL_MEDIA_ENGINE_ONLY');
  assert.equal(outcome.state,'DRAFT_ONLY');
  assert.equal(outcome.cads.technicalStatus,'PASS');
  assert.equal(outcome.cads.publicationApproval,false);
  assert.equal(outcome.workerIntegration.openapi?.status,undefined);
  assert.equal(outcome.workerIntegration.openai.status,'SKIPPED_NOT_AUTHORIZED');
  assert.equal(outcome.workerIntegration.firecrawl.status,'SKIPPED_NOT_AUTHORIZED');
  assert.deepEqual(outcome.workerIntegration.accessibility.skillRefs,
    ['accessibility-engineering','accessibility-advisory']);
  assert.match(html, /class="watermark"/);
  assert.match(html, /src="data:image\/webp;base64,/);
  assert.match(html, /img-src data:/);
  assert.ok(!html.includes('src="https://capital-ai.online/branding/'));
  assert.match(html, /opacity:.09/);
  assert.match(html, /sources-heading/);
  assert.match(html, /GitHub Pull Request #/);
  assert.match(html,/alt="" aria-hidden="true"/);
  assert.match(html,/ENTWURF/);
  assert.doesNotMatch(html,/<script/);
});
test('real parallel network adapters use fixed endpoints, limited public GitHub URLs and no auto-publication',async()=>{
  const urls=[];
  const fetchImpl=async (url,request)=>{
    urls.push(url);
    if(url === 'https://api.openai.com/v1/responses') {
      assert.equal(request.method,'POST');
      const payload=JSON.parse(request.body);
      assert.equal(payload.store,false);
      assert.equal(payload.model,'test-social-model');
      assert.equal(payload.reasoning.effort,'none');
      assert.equal(payload.max_output_tokens,550);
      return new Response(JSON.stringify({output_text:'Transparenter Entwicklungsbericht: PR-Merges nachlesen.'}));
    }
    assert.equal(url,'https://api.firecrawl.dev/v2/scrape');
    const body=JSON.parse(request.body);
    assert.match(body.url,/^https:\/\/github\.com\/SvenKulessa\/Capital-AI\/pull\/\d+$/);
    return new Response(JSON.stringify({data:{markdown:'# Official PR page'}}));
  };
  const {outcome}=await runBatch(source,{...opts,
    env:{SOCIAL_BATCH_EXTERNAL_WORKERS:'enabled',OPENAI_API_KEY:'not-real',SOCIAL_CONTENT_OPENAI_MODEL:'test-social-model',FIRECRAWL_API_KEY:'not-real'},fetchImpl});
  assert.equal(urls.length,3);
  assert.equal(outcome.workerIntegration.openai.status,'DRAFT_ONLY');
  assert.equal(outcome.workerIntegration.firecrawl.status,'ADVISORY_READBACK');
  assert.equal(outcome.workerIntegration.firecrawl.checkedUrls.length,2);
  assert.equal(outcome.channelDrafts.length,3);
  assert.equal(outcome.socialEngine.publicPublishAllowed,false);
  assert.equal(outcome.cads.editorialReview,'REVIEW_REQUIRED');
});
test('OpenAI news worker refuses unset or malformed model without calling provider',async()=>{
  const calls=[];
  for(const model of ['', 'model with space', '../unsafe']) {
    const {outcome}=await runBatch(source,{...opts,env:{
      SOCIAL_BATCH_EXTERNAL_WORKERS:'enabled',OPENAI_API_KEY:'test-only',
      SOCIAL_CONTENT_OPENAI_MODEL:model,
    },fetchImpl:async url=>{calls.push(url);throw Error('unexpected network');}});
    assert.equal(outcome.workerIntegration.openai.status,'SKIPPED_MODEL_NOT_CONFIGURED');
    assert.equal(outcome.cads.publicationApproval,false);
  }
  assert.equal(calls.length,0);
});

test('provider failure is fail-closed and never grants publication',async()=>{
  const {outcome}=await runBatch(source,{...opts,
    env:{SOCIAL_BATCH_EXTERNAL_WORKERS:'enabled',OPENAI_API_KEY:'x',FIRECRAWL_API_KEY:'x'},
    fetchImpl:async()=>({ok:false,status:403,text:async()=>''})});
  assert.equal(outcome.workerIntegration.openai.status,'FAILED_CLOSED');
  assert.equal(outcome.workerIntegration.firecrawl.status,'FAILED_CLOSED');
  assert.equal(outcome.cads.publicationApproval,false);
});
test('watermark modifications, missing skills and preview XSS are blocked',async()=>{
  await assert.rejects(()=>runBatch(source,{...opts,loadFile:async file=>file===BRAND_ASSET?Buffer.from('evil'):readFileSync(file)}),/SOCIAL_BATCH_WATERMARK_DIGEST_MISMATCH/);
  const html=renderDraftHtml({headline:'<img src=x onerror=evil()>',article:'</pre><script>attack()</script>'},readFileSync(BRAND_ASSET));
  assert.throws(()=>renderDraftHtml({headline:'test',article:'test'},Buffer.from('tampered')),/SOCIAL_BATCH_WATERMARK_DIGEST_MISMATCH/);
  assert.doesNotMatch(html,/<\s*script\b/i);
  assert.match(html,/&lt;script&gt;/);
  assert.equal(toolSuitability().length,3);
  assert.equal(toolSuitability()[2].decision,'NOT_ENABLED');
});

test('workflow is count-scoped to the existing milestone and never invokes a publisher',()=>{
  const workflow=readFileSync('.github/workflows/merge-milestones.yml','utf8');
  assert.match(workflow,/if: \$\{\{ steps\.milestones\.outputs\.news != '' \}\}/);
  assert.match(workflow,/NEWS_MILESTONE_PR: \$\{\{ steps\.milestones\.outputs\.news \}\}/);
  assert.match(workflow,/node --import tsx scripts\/growth\/pr-merge-social-batch\.mjs/);
  assert.match(workflow,/social-merge-batch-\$\{\{ steps\.milestones\.outputs\.news \}\}/);
  assert.doesNotMatch(workflow,/node scripts\/growth\/pr-merge-social-batch\.mjs.*publish/);
});

test('worker byte budget rejects a multibyte oversized stream before buffering the remainder', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('ä'.repeat(12001))); },
    cancel() { cancelled = true; },
  }));
  await assert.rejects(readWorkerJson(response, 24000), /WORKER_RESPONSE_OVERSIZE/);
  assert.equal(cancelled, true);
  assert.deepEqual(await readWorkerJson(new Response('{"ok":true}'), 64), {ok:true});
  await assert.rejects(readWorkerJson(new Response('invalid'), 64), SyntaxError);
});
