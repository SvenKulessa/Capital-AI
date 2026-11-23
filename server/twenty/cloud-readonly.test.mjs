import test from 'node:test';
import assert from 'node:assert/strict';
import { TwentyCloudMetadataReadonlyClient, validateTwentyOrigin } from './cloud-readonly.mjs';
const workspaceUrl='https://capital-ai.twenty.com';
const accessToken='synthetic-secret-token';
const id='12345678-1234-1234-1234-123456789abc';
test('strict workspace origin rejects spoofing and embedded secrets',()=>{
 assert.equal(validateTwentyOrigin(workspaceUrl),workspaceUrl);
 for(const u of ['http://capital-ai.twenty.com','https://capital-ai.twenty.com.evil.test','https://capital-ai.twenty.com:444','https://user:pass@capital-ai.twenty.com','https://capital-ai.twenty.com/settings','https://capital-ai.twenty.com/?x=1','https://capital-ai.twenty.com/#fields'])
   assert.throws(()=>validateTwentyOrigin(u),/BLOCKED/);
});
test('metadata query is fixed, read-only, and never grants product field approval',async()=>{
 let calls=0;
 const client=new TwentyCloudMetadataReadonlyClient({workspaceUrl,accessToken,fetchImpl:async(url,options)=>{
   calls++;assert.equal(url,workspaceUrl+'/metadata');assert.equal(options.method,'POST');
   assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer '+accessToken);
   assert.match(JSON.parse(options.body).query,/query CapitalAiProductsMetadata/);
   assert.doesNotMatch(options.body,/mutation|createProduct|deleteProduct/);
   return {status:200,ok:true,text:async()=>JSON.stringify({data:{objects:{edges:[{node:{id,nameSingular:'product',namePlural:'products'}}]}}})};
 }});
 const r=await client.readProductsObject();
 assert.equal(calls,1);assert.equal(r.fieldsStatus,'NOT_PROVEN');assert.equal(r.mappingStatus,'BLOCKED');assert.equal(r.writeAllowed,false);
 assert.ok(!JSON.stringify(r).includes(accessToken));
});
test('deny unauthorized, GraphQL errors, ambiguous objects, oversized and malformed responses',async()=>{
 const cases=[
 [{status:403,ok:false,text:async()=>''},/HTTP_DENIED/],
 [{status:200,ok:true,text:async()=>JSON.stringify({errors:[{message:'unauthorized'}]})},/METADATA_NOT_PROVEN/],
 [{status:200,ok:true,text:async()=>JSON.stringify({data:{objects:{edges:[]}}})},/PRODUCTS_NOT_PROVEN/],
 [{status:200,ok:true,text:async()=>JSON.stringify({data:{objects:{edges:Array(2).fill({node:{id,nameSingular:'product',namePlural:'products'}})}}})},/PRODUCTS_NOT_PROVEN/],
 [{status:200,ok:true,text:async()=>'€'.repeat(90000)},/RESPONSE_TOO_LARGE/],
 [{status:200,ok:true,text:async()=>'{bad'},/JSON_INVALID/],
 ];
 for(const [response,error] of cases) await assert.rejects(()=>new TwentyCloudMetadataReadonlyClient({workspaceUrl,accessToken,fetchImpl:async()=>response}).readProductsObject(),error);
});

test('tenant, digest and field evidence are independently fail-closed', async () => {
 const { validateProductEvidence } = await import('./cloud-readonly.mjs');
 const good={expectedWorkspaceOrigin:workspaceUrl,observedWorkspaceOrigin:workspaceUrl,expectedObjectId:id,observedObjectId:id,expectedTenantId:'tenant-A',observedTenantId:'tenant-A',expectedDigest:'a'.repeat(64),observedDigest:'a'.repeat(64),fieldSchemaVerified:true};
 assert.equal(validateProductEvidence(good).writeAllowed,false);
 for(const [change,pattern] of [
  [{observedWorkspaceOrigin:'https://evil.example'},/ORIGIN_BLOCKED/],
  [{observedObjectId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'},/OBJECT_ID_MISMATCH/],
  [{observedTenantId:'tenant-B'},/TENANT_MISMATCH/],
  [{expectedTenantId:''},/TENANT_MISMATCH/],
  [{observedDigest:'b'.repeat(64)},/DIGEST_MISMATCH/],
  [{expectedDigest:'not-a-digest'},/DIGEST_MISMATCH/],
  [{fieldSchemaVerified:false},/FIELDS_NOT_PROVEN/],
 ]) assert.throws(()=>validateProductEvidence({...good,...change}),pattern);
});
