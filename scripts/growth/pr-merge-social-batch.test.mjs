import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertBatch,runBatch,renderDraftHtml,toolSuitability,
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
  assert.match(html, /opacity:.09/);
  assert.match(html,/alt="" aria-hidden="true"/);
  assert.match(html,/ENTWURF/);
  assert.doesNotMatch(html,/<script/);
});
test('real parallel network adapters use fixed endpoints, limited public GitHub URLs and no auto-publication',async()=>{
  const urls=[];
  const fetchImpl=async (url,request)=>{
    urls.push(url);
    if(url.includes('openai.com')) {
      assert.equal(request.method,'POST');
      assert.equal(JSON.parse(request.body).store,false);
      return {ok:true,text:async()=>JSON.stringify({output_text:'Transparenter Entwicklungsbericht: PR-Merges nachlesen.'})};
    }
    assert.equal(url,'https://api.firecrawl.dev/v2/scrape');
    const body=JSON.parse(request.body);
    assert.match(body.url,/^https:\/\/github\.com\/SvenKulessa\/Capital-AI\/pull\/\d+$/);
    return {ok:true,text:async()=>JSON.stringify({data:{markdown:'# Official PR page'}})};
  };
  const {outcome}=await runBatch(source,{...opts,
    env:{SOCIAL_BATCH_EXTERNAL_WORKERS:'enabled',OPENAI_API_KEY:'not-real',FIRECRAWL_API_KEY:'not-real'},fetchImpl});
  assert.equal(urls.length,3);
  assert.equal(outcome.workerIntegration.openai.status,'DRAFT_ONLY');
  assert.equal(outcome.workerIntegration.firecrawl.status,'ADVISORY_READBACK');
  assert.equal(outcome.workerIntegration.firecrawl.checkedUrls.length,2);
  assert.equal(outcome.channelDrafts.length,3);
  assert.equal(outcome.socialEngine.publicPublishAllowed,false);
  assert.equal(outcome.cads.editorialReview,'REVIEW_REQUIRED');
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
  const html=renderDraftHtml({headline:'<img src=x onerror=evil()>',article:'</pre><script>attack()</script>'});
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&lt;script&gt;/);
  assert.equal(toolSuitability().length,3);
  assert.equal(toolSuitability()[2].decision,'NOT_ENABLED');
});
