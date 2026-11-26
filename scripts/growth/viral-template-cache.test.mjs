import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, chmodSync, readFileSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createViralTemplateDiskCache } from './viral-template-cache.mjs';
const id='a'.repeat(64), ownerId='12345678-1234-4234-8234-123456789abc', keyHex='b'.repeat(64);
const assets={x_post:{hook:'synthetic only'},instagram_carousel:{},short_form_video:{},youtube_long_form:{}};
const withRoot=fn=>{const root=mkdtempSync(join(tmpdir(),'viral-cache-'));try{return fn(root);}finally{rmSync(root,{recursive:true,force:true});}};
test('encrypted cache survives new instance, expires and rejects wrong owner/key',()=>withRoot(root=>{
 const cache=createViralTemplateDiskCache({root,ownerId,keyHex});assert.equal(cache.write(id,100,assets),true);
 assert.doesNotMatch(readFileSync(join(root,id+'.vpc'),'utf8'),/synthetic only/);
 const fresh=createViralTemplateDiskCache({root,ownerId,keyHex});assert.deepEqual(fresh.read(id,101),{created:100,assets});assert.equal(fresh.read(id,600101),null);
 assert.equal(createViralTemplateDiskCache({root,ownerId,keyHex:'c'.repeat(64)}).read(id,101),null);
 assert.equal(createViralTemplateDiskCache({root,ownerId:'12345678-1234-4234-8234-123456789abd',keyHex}).read(id,101),null);
}));
test('tampering, unsafe permissions, path traversal and symlinks fail closed',()=>withRoot(root=>{
 const cache=createViralTemplateDiskCache({root,ownerId,keyHex});assert.equal(cache.write(id,100,assets),true);const path=join(root,id+'.vpc');
 const envelope=JSON.parse(readFileSync(path,'utf8'));envelope.tag=Buffer.alloc(16).toString('base64');writeFileSync(path,JSON.stringify(envelope));assert.equal(cache.read(id,101),null);
 assert.equal(cache.write('../unsafe',100,assets),false);assert.equal(cache.read('../unsafe',101),null);
 unlinkSync(path);symlinkSync('/etc/passwd',path);assert.equal(cache.read(id,101),null);unlinkSync(path);
 chmodSync(root,0o755);assert.throws(()=>createViralTemplateDiskCache({root,ownerId,keyHex}),/DIRECTORY_UNSAFE/);assert.equal(cache.write(id,100,assets),false);chmodSync(root,0o700);
}));
