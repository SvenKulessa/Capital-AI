import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFounderAccess} from './founder-access.mjs';
const OWNER='00000000-0000-4000-8000-000000000001';
const SPONSOR='00000000-0000-4000-8000-000000000002';
const INVESTOR='00000000-0000-4000-8000-000000000003';
function fixture({id=SPONSOR,confirmed=true,owner=false,env={},method='GET'}={}){
 const answers=[],headers={};
 const api=createFounderAccess({env,auth:{
  verify:async()=>id?{userId:id,emailVerified:confirmed}:null,
  authorizeIamRole:async(_req,_res,role)=>owner&&role==='owner'
 }});
 const req={method,headers:{'x-founder-role':'owner','x-user-id':OWNER}};
 const res={setHeader:(k,v)=>{headers[k]=v;}};
 return {answers,headers,run:(path='/api/private/founder/access')=>api.handle(req,res,new URL(path,'https://capital-ai.invalid'),(_res,status,body)=>answers.push({status,body}))};
}
test('default denial prevents forged-header escalation',async()=>{
 const x=fixture();assert.equal(await x.run(),true);assert.equal(x.answers[0].status,403);
 assert.equal(x.headers['Cache-Control'],'private, no-store');assert.equal(x.headers['X-Robots-Tag'],'noindex, nofollow');
});
test('anonymous, unverified and invalid identity are refused',async()=>{
 for(const c of [{id:null},{confirmed:false},{id:'not-a-uuid'}]){
  const x=fixture({...c,env:{FOUNDER_SPONSOR_USER_IDS:SPONSOR}});await x.run();assert.equal(x.answers[0].status,403);
 }
});
test('invited sponsor has only sponsor privileges',async()=>{
 const x=fixture({env:{FOUNDER_SPONSOR_USER_IDS:SPONSOR,FOUNDER_INVESTOR_USER_IDS:INVESTOR}});
 await x.run();assert.equal(x.answers[0].status,200);assert.deepEqual(x.answers[0].body.sections,['sponsoring']);
 assert.equal(x.answers[0].body.privateMaterialsAvailable,false);
});
test('invited investor has only investor relations privilege',async()=>{
 const x=fixture({id:INVESTOR,env:{FOUNDER_SPONSOR_USER_IDS:SPONSOR,FOUNDER_INVESTOR_USER_IDS:INVESTOR}});
 await x.run();assert.deepEqual(x.answers[0].body.sections,['investor-relations']);
});
test('verified IAM owner can access both sections',async()=>{
 const x=fixture({id:OWNER,owner:true});await x.run();assert.equal(x.answers[0].status,200);
 assert.deepEqual(x.answers[0].body.sections,['sponsoring','investor-relations']);
});
test('invalid allowlists, duplicate UUIDs and non-GET methods fail closed',async()=>{
 for(const value of ['invalid',SPONSOR+','+SPONSOR,',']){
  const x=fixture({env:{FOUNDER_SPONSOR_USER_IDS:value}});
  await x.run();assert.equal(x.answers[0].status,503);
 }
 const x=fixture({id:OWNER,owner:true,method:'POST'});await x.run();
 assert.equal(x.answers[0].status,405);assert.equal(x.headers.Allow,'GET');
});
test('unrelated API is not intercepted',async()=>{
 const x=fixture();assert.equal(await x.run('/api/auth/session'),false);assert.equal(x.answers.length,0);
});

test('production Docker runtime includes the founder API module imported by the server',()=>{
 const docker=readFileSync(new URL('../Dockerfile',import.meta.url),'utf8');
 const runtime=docker.split(/^FROM crypto-base AS runtime$/m)[1];
 assert.ok(runtime,'production runtime stage is required');
 assert.match(runtime,/^COPY server\/founder-access\.mjs server\/private-knowledge-vault\.mjs/m);
 const entry=readFileSync(new URL('./index.mjs',import.meta.url),'utf8');
 assert.match(entry,/import \{ createFounderAccess \} from '\.\/founder-access\.mjs'/);
});
