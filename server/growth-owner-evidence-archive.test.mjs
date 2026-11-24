import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {createGrowthEvidenceArchive} from './growth-owner-evidence-archive.mjs';
import {createGrowthEvidenceApi} from './growth-owner-evidence-api.mjs';
const ownerId='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const keyHex='a4'.repeat(32);
const row={id:'ga4',name:'GA4 Acquisition',domain:'GROWTH',priority:'P0',status:'VERIFIED',endpoint:'',auth:'',flow:'',tests:'',error:'',dependencies:'',approvals:'',operation:'',next:'',evidence:'Synthetic test only',origin:'GA4_READBACK'};
const raw=Buffer.from(JSON.stringify({schema:'CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1',snapshots:[{version:1,at:'2026-11-24T12:00:00.000Z',rows:[row]}]}));
const id=createHash('sha256').update(raw).digest('hex');
async function isolated(fn){
 const base=await mkdtemp(join(tmpdir(),'growth-evidence-'));
 try{await fn(base,createGrowthEvidenceArchive({root:join(base,'vault'),ownerId,keyHex}));}
 finally{await rm(base,{recursive:true,force:true});}
}
test('immutable archive, authenticated encryption, backup and restore across isolated roots',async()=>isolated(async(base,vault)=>{
 assert.deepEqual(await vault.list(),[]);
 assert.equal((await vault.put(raw)).id,id);
 assert.equal((await vault.put(raw)).authority,'DOCUMENTATION_ONLY');
 const disk=await readFile(join(base,'vault',id+'.caige'));
 assert(!disk.includes(raw));assert.deepEqual(await vault.read(id),raw);
 assert.deepEqual(await vault.backup(id),disk);
 const restored=createGrowthEvidenceArchive({root:join(base,'restored'),ownerId,keyHex});
 await restored.restore(id,disk);assert.deepEqual(await restored.read(id),raw);
 assert.deepEqual((await restored.list()).map(x=>x.id),[id]);
 assert.deepEqual(await vault.backup(id),disk);
}));
test('cross-owner, wrong key, tampered bytes, invalid schema and symlink fail closed',async()=>isolated(async(base,vault)=>{
 await vault.put(raw);const disk=await vault.backup(id);
 for(const v of [createGrowthEvidenceArchive({root:join(base,'vault'),ownerId:other,keyHex}),
 createGrowthEvidenceArchive({root:join(base,'vault'),ownerId,keyHex:'b5'.repeat(32)})])await assert.rejects(v.read(id));
 const target=createGrowthEvidenceArchive({root:join(base,'other'),ownerId,keyHex});
 const altered=JSON.parse(disk);altered.tag=Buffer.alloc(16).toString('base64');
 await assert.rejects(target.restore(id,Buffer.from(JSON.stringify(altered))));
 await assert.rejects(vault.put(Buffer.from('{}')));
 const bad=JSON.parse(raw);bad.snapshots[0].rows[0].token='x';
 await assert.rejects(vault.put(Buffer.from(JSON.stringify(bad))));
 bad.snapshots[0].rows[0]= {...row,evidence:'Bearer synthetic-test-secret'};
 await assert.rejects(vault.put(Buffer.from(JSON.stringify(bad))));
 await symlink('/etc/passwd',join(base,'vault','b'.repeat(64)+'.caige'));
 await assert.rejects(vault.read('b'.repeat(64)));
 await writeFile(join(base,'vault',id+'.caige'),Buffer.from(JSON.stringify(altered)));
 await assert.rejects(vault.read(id));
}));
const env={CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE_ENABLED:'true',CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED:'true'};
const path='/api/profile/growth-intelligence/evidence-history';
async function call(api,{method='GET',suffix='',payload,contentType='application/json'}={}){
 const req=Object.assign(Readable.from(payload?[payload]:[]),{method,headers:{'content-type':contentType}});
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status,h){this.status=status;Object.assign(this.headers,h);},end(data){this.data=data;}};
 assert.equal(await api.handle(req,res,new URL('https://capital-ai.online'+path+suffix),(r,status,data)=>{r.status=status;r.data=data;}),true);
 return res;
}
test('disabled and recovery flags do not touch disk; owner and CSRF gates precede writes',async()=>isolated(async(base,archive)=>{
 const api=(allowed,flags=env,origin=true)=>createGrowthEvidenceApi({env:flags,authorized:async()=>allowed,auth:{sameOrigin:()=>origin},archive});
 for(const flags of [{}, {...env,CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED:'false'}])
 assert.equal((await call(api(true,flags),{method:'POST',payload:raw})).status,503);
 assert.equal((await call(api(false),{method:'POST',payload:raw})).status,404);
 assert.equal((await call(api(true,env,false),{method:'POST',payload:raw})).status,403);
 assert.deepEqual(await archive.list(),[]);
 assert.equal((await call(api(true),{method:'POST',payload:raw})).status,201);
 assert.equal((await call(api(true))).data.items[0].id,id);
 assert.equal((await call(api(false),{suffix:'/file/'+id})).status,404);
 assert.deepEqual((await call(api(true),{suffix:'/file/'+id})).data,raw);
 const backup=await call(api(true),{suffix:'/backup/'+id});
 assert.equal(backup.status,200);assert(!backup.data.includes(raw));
 assert.equal((await call(api(true),{method:'POST',suffix:'/restore/'+id,payload:backup.data,contentType:'application/octet-stream'})).status,201);
 assert.equal((await call(api(true),{method:'POST',payload:raw,contentType:'text/plain'})).status,415);
}));
