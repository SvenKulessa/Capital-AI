import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createBlueprintDiskVault } from './blueprint-private-cloud.mjs';
import { createBlueprintCommerce } from './blueprint-commerce.mjs';

const key = 'ab'.repeat(32);
const source = Buffer.from('Private Blueprint fixture. '.repeat(13));
const digest = createHash('sha256').update(source).digest('hex');
const sku = 'CAP-BP-001';
async function fixture(fn) {
  const path = await mkdtemp(join(tmpdir(), 'capital-blueprint-vault-'));
  try { await fn(path); } finally { await rm(path, { force:true,recursive:true }); }
}
const vaultAt = path => createBlueprintDiskVault({root:join(path,'blueprints'),keyHex:key});
test('private vault encrypts original, has immutable version and verifies roundtrip without public bytes', async()=>{
 await fixture(async path=>{
  const vault=vaultAt(path);
  assert.equal((await vault.verify()).writable,true);
  const a=await vault.put(sku,source,digest);
  assert.equal(a.sha256,digest);
  assert.equal(a.bytes,source.length);
  await assert.rejects(vault.put(sku,source,digest),{code:'EEXIST'});
  const files=await readdir(join(path,'blueprints'));
  assert.equal(files.length,1);
  const stored=await readFile(join(path,'blueprints',files[0]));
  assert(!stored.includes(source));
  assert.deepEqual(await vault.read(sku,digest),source);
  const backup=await vault.backup(sku,digest);
  assert.equal(backup.sha256,createHash('sha256').update(backup.bytes).digest('hex'));
  await unlink(join(path,'blueprints',files[0]));
  await vault.restore(sku,backup.bytes,digest);
  assert.deepEqual(await vault.read(sku,digest),source);
 });
});
test('vault rejects wrong key, digest, tampering, invalid sku and symlink file',async()=>{
 await fixture(async path=>{
  const vault=vaultAt(path);
  assert.equal(vault.configured(),true);
  assert.equal(createBlueprintDiskVault({root:join(path,'bad'),keyHex:'bad'}).configured(),false);
  await assert.rejects(vault.put('../../etc/passwd',source,digest),/BLUEPRINT_IDENTITY_INVALID/);
  await assert.rejects(vault.put(sku,source,'0'.repeat(64)),/BLUEPRINT_SOURCE_MISMATCH/);
  await vault.put(sku,source,digest);
  const other=createBlueprintDiskVault({root:join(path,'blueprints'),keyHex:'cd'.repeat(32)});
  await assert.rejects(other.read(sku,digest),/BLUEPRINT_CIPHER_AUTH_FAILED/);
  const target=join(path,'blueprints','CAP-BP-001-v1.0.0.caibak');
  const bytes=await readFile(target);
  const obj=JSON.parse(bytes.toString('utf8'));
  obj.content=Buffer.from('tampered').toString('base64');
  await writeFile(target,JSON.stringify(obj));
  await assert.rejects(vault.read(sku,digest),/BLUEPRINT_CIPHER_FORMAT_INVALID|BLUEPRINT_CIPHER_AUTH_FAILED/);
  await unlink(target);
  await symlink('/etc/passwd',target);
  await assert.rejects(vault.read(sku,digest),/BLUEPRINT_FILE_INVALID/);
 });
});
const auth=(owner=true)=>({ verify:async()=>({userId:'00000000-0000-4000-8000-000000000001',emailVerified:true}),
 authorizeIamRole:async()=>owner,sameOrigin:()=>true });
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture_key_1234567890123456'};
const rpcFetch=async (_url,options)=>{
  const request=JSON.parse(options.body);
  if(request._action==='readiness') return new Response(JSON.stringify({ready:true,sha256:digest}),{status:200});
  if(request._action==='download') return new Response(JSON.stringify({entitled:true,sku,version:'1.0.0',fileName:'CAP-BP-001-test.md',bytes:source.length,sha256:digest,dataBase64:source.toString('base64')}),{status:200});
  return new Response('{}',{status:200});
};
function request(method,bytes,headers={}) {
 return Object.assign(Readable.from(bytes?[bytes]:[]),{method,headers});
}
function reply() {return {headers:{},setHeader(k,v){this.headers[k]=v},writeHead(code,headers){this.statusCode=code;Object.assign(this.headers,headers)},end(v){this.body=v}}}
const json=(res,code,body)=>{res.statusCode=code;res.json=body};
async function call(cloud,actor,part,method='GET',body,headers={}){
 const commerce=createBlueprintCommerce({env,auth:actor,privateCloud:cloud,fetchImpl:rpcFetch});
 const res=reply();
 const req=request(method,body,headers);
 await commerce.handle(req,res,new URL('https://capital-ai.online/api/billing/blueprints/'+part),json);
 return res;
}
test('owner can import and export only released exact-sha bytes; same customer delivery still requires paid RPC',async()=>{
 await fixture(async path=>{
  const cloud=vaultAt(path);
  const headers={'content-type':'text/markdown','x-blueprint-release-sha256':digest};
  assert.equal((await call(cloud,auth(false),'private-cloud/verify')).statusCode,403);
  assert.equal((await call(cloud,auth(true),'private-cloud/verify')).statusCode,200);
  assert.equal((await call(cloud,auth(false),'private-cloud/import/'+sku,'POST',source,headers)).statusCode,403);
  assert.equal((await call(cloud,auth(true),'private-cloud/import/'+sku,'POST',source,headers)).statusCode,201);
  const backup=await call(cloud,auth(true),'private-cloud/backup/'+sku);
  assert.equal(backup.statusCode,200);
  assert.equal(backup.headers['Content-Type'],'application/octet-stream');
  assert.equal(backup.headers['X-Backup-SHA256'],createHash('sha256').update(backup.body).digest('hex'));
  const customer=await call(cloud,auth(false),'download/'+sku);
  assert.equal(customer.statusCode,200);
  assert.deepEqual(customer.body,source);
  assert.equal((await call(cloud,auth(true),'private-cloud/import/'+sku,'POST',source,headers)).statusCode,409);
 });
});
test('disk failures cannot grant a purchase or bypass release authority',async()=>{
 await fixture(async path=>{
  const cloud=vaultAt(path);
  const buyer=auth(false);
  const noPay=(_url,options)=>{
   let action=JSON.parse(options.body)._action;
   return Promise.resolve(new Response(JSON.stringify(action==='download'?{entitled:false}:{ready:false}),{status:200}));
  };
  const c=createBlueprintCommerce({env,auth:buyer,privateCloud:cloud,fetchImpl:noPay});
  let response=reply();
  await c.handle(request('GET'),response,new URL('https://capital-ai.online/api/billing/blueprints/download/'+sku),json);
  assert.equal(response.statusCode,403);
  response=reply();
  await c.handle(request('POST',source,{'content-type':'text/markdown','x-blueprint-release-sha256':digest}),response,new URL('https://capital-ai.online/api/billing/blueprints/private-cloud/import/'+sku),json);
  assert.equal(response.statusCode,403);
 });
});
