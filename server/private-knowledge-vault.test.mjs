import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,readdir,rm,writeFile,symlink,unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createPrivateKnowledgeVault } from './private-knowledge-vault.mjs';
import { createPrivateKnowledgeApi } from './private-knowledge-api.mjs';

const KEY='a4'.repeat(32),WRONG='b5'.repeat(32);
const id='architecture-glossary',version='1.0.0';
const data=Buffer.from('# Architekturglossar\n\nOwner-only architecture content without secrets. '.repeat(5));
const digest=createHash('sha256').update(data).digest('hex');
async function setup(fn){
 const path=await mkdtemp(join(tmpdir(),'private-knowledge-'));
 try{await fn({dir:join(path,'kb'),path,vault:createPrivateKnowledgeVault({root:join(path,'kb'),keyHex:KEY})})}
 finally{await rm(path,{force:true,recursive:true})}
}
test('isolated private knowledge vault has authenticated ciphertext, immutable versions and distinct record class',async()=>{
 await setup(async({vault,dir})=>{
  assert.equal((await vault.verify()).writable,true);
  assert.equal(vault.slots().length,4);
  const result=await vault.put(id,version,data,digest);
  assert.equal(result.sha256,digest);
  assert.deepEqual((await vault.read(id,version)).plaintext,data);
  assert.deepEqual((await vault.list()).map(x=>x.id),[id]);
  const filename=join(dir,id+'-v'+version+'.caikb');
  const cipher=await readFile(filename);
  assert.equal(cipher.includes(data),false);
  assert.equal((await vault.backup(id,version)).ciphertextSha256,createHash('sha256').update(cipher).digest('hex'));
  await assert.rejects(vault.put(id,version,data,digest),{code:'EEXIST'});
  await unlink(filename);
  await vault.restore(id,version,cipher,digest);
  assert.deepEqual((await vault.read(id,version)).plaintext,data);
 });
});
test('fail closed on invalid key, malformed paths, replaced ciphertext and symlinks',async()=>{
 await setup(async({vault,dir,path})=>{
  assert.equal(createPrivateKnowledgeVault({root:join(path,'bad'),keyHex:'bad'}).configured(),false);
  await assert.rejects(vault.put('../secrets',version,data,digest),/KNOWLEDGE_ID_INVALID/);
  await assert.rejects(vault.put(id,'../../etc',data,digest),/KNOWLEDGE_ID_INVALID/);
  await assert.rejects(vault.put(id,version,data,'0'.repeat(64)),/KNOWLEDGE_HASH_INVALID/);
  await vault.put(id,version,data,digest);
  const wrong=createPrivateKnowledgeVault({root:dir,keyHex:WRONG});
  await assert.rejects(wrong.read(id,version),/KNOWLEDGE_AUTH_INVALID/);
  const file=join(dir,id+'-v'+version+'.caikb');
  const content=JSON.parse((await readFile(file)).toString());
  content.content=Buffer.from('tamper').toString('base64');
  await writeFile(file,JSON.stringify(content));
  await assert.rejects(vault.read(id,version),/KNOWLEDGE_CIPHER_INVALID|KNOWLEDGE_AUTH_INVALID/);
  await unlink(file);
  await symlink('/etc/passwd',file);
  await assert.rejects(vault.read(id,version),/KNOWLEDGE_FILE_INVALID/);
 });
});
const auth=(owner=true,sameOrigin=true,emailVerified=true)=>({
 verify:async()=>({userId:'00000000-0000-4000-8000-000000000001',emailVerified}),
 authorizeIamRole:async(_req,_res,role)=>owner&&role==='owner',
 sameOrigin:()=>sameOrigin
});
function req(method='GET',body,headers={}){
 return Object.assign(Readable.from(body?[body]:[]),{method,headers})
}
function res(){return{headers:{},setHeader(k,v){this.headers[k]=v},writeHead(code,h){this.statusCode=code;Object.assign(this.headers,h)},end(x){this.body=x}}}
const json=(r,code,x)=>{r.statusCode=code;r.payload=x};
async function run(vault,actor,route,method='GET',body,headers={}){
 const api=createPrivateKnowledgeApi({auth:actor,vault}),response=res();
 assert.equal(await api.handle(req(method,body,headers),response,new URL('https://capital-ai.online/api/private/knowledge/'+route),json),true);
 return response;
}
test('Owner IAM controls read/write/backup; customers and forged writes never access concepts',async()=>{
 await setup(async({vault,dir})=>{
  const headers={'content-type':'text/markdown','x-knowledge-sha256':digest};
  assert.equal((await run(vault,auth(false),'verify')).statusCode,403);
  assert.equal((await run(vault,auth(true,true,false),'inventory')).statusCode,403);
  assert.equal((await run(vault,auth(true,false),'import/'+id+'/'+version,'POST',data,headers)).statusCode,403);
  assert.equal((await run(vault,auth(false),'import/'+id+'/'+version,'POST',data,headers)).statusCode,403);
  assert.equal((await run(vault,auth(true),'verify')).statusCode,200);
  assert.equal((await run(vault,auth(true),'import/'+id+'/'+version,'POST',data,headers)).statusCode,201);
  assert.equal((await run(vault,auth(true),'import/'+id+'/'+version,'POST',data,headers)).statusCode,409);
  assert.equal((await run(vault,auth(false),'file/'+id+'/'+version)).statusCode,403);
  const files=await run(vault,auth(true),'inventory');
  assert.deepEqual(files.payload.items.map(x=>x.id),[id]);
  const plain=await run(vault,auth(true),'file/'+id+'/'+version);
  assert.equal(plain.statusCode,200);
  assert.equal(plain.headers['Cache-Control'],'private, no-store');
  assert.deepEqual(plain.body,data);
  const backup=await run(vault,auth(true),'backup/'+id+'/'+version);
  assert.equal(backup.statusCode,200);
  assert(Buffer.isBuffer(backup.body));
  assert.equal(backup.headers['Content-Length'],backup.body.length);
  assert(!backup.body.includes(data));
  await unlink(join(dir,id+'-v'+version+'.caikb'));
  assert.equal((await run(vault,auth(true),'restore/'+id+'/'+version,'POST',backup.body,{
   'content-type':'application/octet-stream','x-knowledge-sha256':digest})).statusCode,201);
  assert.deepEqual((await vault.read(id,version)).plaintext,data);
 });
});
