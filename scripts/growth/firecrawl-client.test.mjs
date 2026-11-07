import test from 'node:test';
import assert from 'node:assert/strict';
import { firecrawlConfiguration,scrapePublicSource } from './firecrawl-client.mjs';
const source='https://github.com/SvenKulessa/Capital-AI/pull/551';
const env={FIRECRAWL_BASE_URL:'http://127.0.0.1:3002',SOCIAL_BATCH_EXTERNAL_WORKERS:'enabled',FIRECRAWL_API_KEY:'cloud-key-not-for-loopback'};
test('local transport uses the API contract without leaking hosted keys (mock transport, no runtime attestation)',async()=>{
 const result=await scrapePublicSource(source,{env,allowedUrls:new Set([source]),fetchImpl:async(url,request)=>{
  assert.equal(url,'http://127.0.0.1:3002/v2/scrape');assert.equal(request.headers.Authorization,undefined);
  assert.equal(request.redirect,'error');assert.equal(JSON.parse(request.body).url,source);
  return new Response(JSON.stringify({success:true,data:{markdown:'# Reviewed source'}}));
 }});assert.equal(result,'# Reviewed source');
});
test('untrusted endpoints and arbitrary sources fail before egress',async()=>{
 for(const url of ['http://169.254.169.254','http://10.0.0.1:3002','http://127.0.0.1:3002@evil.example','https://api.firecrawl.dev.evil.example','http://localhost:3002/?key=bad']) {
  assert.throws(()=>firecrawlConfiguration({...env,FIRECRAWL_BASE_URL:url}),/ENDPOINT_NOT_ALLOWED/);
 }
 const fetchImpl=async()=>assert.fail('no egress expected');
 await assert.rejects(scrapePublicSource('https://evil.example',{env,allowedUrls:new Set([source]),fetchImpl}),/SOURCE_NOT_ALLOWED/);
 await assert.rejects(scrapePublicSource(source,{env:{},allowedUrls:new Set([source]),fetchImpl}),/NOT_AUTHORIZED/);
});
test('upstream failures and oversized responses are rejected',async()=>{
 const options={env,allowedUrls:new Set([source])};
 await assert.rejects(scrapePublicSource(source,{...options,fetchImpl:async()=>new Response('{}',{status:500})}),/HTTP_FAILURE/);
 await assert.rejects(scrapePublicSource(source,{...options,fetchImpl:async()=>new Response('a'.repeat(50001))}),/OVERSIZE/);
 await assert.rejects(scrapePublicSource(source,{...options,fetchImpl:async()=>new Response('{"success":false}') }),/RESPONSE_INVALID/);
});
