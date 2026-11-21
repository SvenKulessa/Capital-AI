import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deliverDriveArtifact} from './drive-artifact-delivery.mjs';
import {routingContract,acodeContract} from './drive-artifact-router.mjs';

const root='1CapitalProjectRootFixture', acodeRoot='1AcodeRootFixture___';
const projectFolder='1CapitalAuditFolderFixture';
const acodeFolder=acodeContract.driveFolderId;
const folderMime='application/vnd.google-apps.folder';
const request={project:'CAPITAL-AI',scope:'PROJECT',category:'TRUST_AUDIT',
  topic:'EXPOSURE_AUDIT',extension:'md',date:'2026-11-21',sensitivity:'REDACTED',
  privacyReview:'VERIFIED',rightsReview:'VERIFIED'};
const auth={project:'CAPITAL-AI',operation:'CREATE_ONLY',approved:true};
const hash=b=>createHash('sha256').update(b).digest('hex');
const content=Buffer.from('redacted test fixture');
function mock(){
  const records=new Map(),folders=new Map(),written=[];
  function addChain(path,leafId,rootId){
    const parts=path.split('/');
    let parent=null;
    for(let i=0;i<parts.length;i++){
      const id=i===0?rootId:i===parts.length-1?leafId:
        '1MockFolder'+path.replace(/[^A-Za-z0-9]/g,'').slice(0,24)+i;
      folders.set(id,{id,name:parts[i],mimeType:folderMime,
        parents:parent?[parent]:[],capabilities:{canAddChildren:true}});
      parent=id;
    }
  }
  addChain(routingContract.routes.TRUST_AUDIT.folder,projectFolder,root);
  addChain(acodeContract.driveFolder,acodeFolder,acodeRoot);
  let lease=Promise.resolve();
  const p={
    authorizedRoots:{PROJECT:root,ACODE:acodeRoot},
    async assertCreateAuthorized(){return true;},
    async resolveFolderId(path){return path===acodeContract.driveFolder?acodeFolder:projectFolder;},
    async getFolder(id){return folders.get(id);},
    async listFolder({folderId,pageToken}){
      if(pageToken!==null)throw Error('unexpected token');
      return {files:[...records.values()].filter(f=>f.parents[0]===folderId)
        .map(f=>({id:f.id,name:f.name,parentId:folderId})),nextPageToken:null};
    },
    async getFile(id){return records.get(id);},
    async readFileBytes(id){return records.get(id)?.bytes;},
    async uploadNewFile(args){
      if(args.mode!=='CREATE_ONLY')throw Error('not create');
      const id='1CreatedFileFixture'+String(written.length+1).padStart(3,'0');
      const rec={id,name:args.fileName,parents:[args.parentFolderId],bytes:Buffer.from(args.fileBytes)};
      records.set(id,rec);written.push(args);return {id};
    },
    async withExclusiveCreateLease(key,fn){
      const prev=lease;let unlock;lease=new Promise(resolve=>unlock=resolve);
      await prev;try{return await fn();}finally{unlock();}
    }
  };
  return {p,records,folders,written};
}
test('create-only upload verifies parent, name and sha',async()=>{
  const {p,written}=mock();
  const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'VERIFIED_CREATED');
  assert.equal(r.filename,'2026-11-21_TRUST_EXPOSURE_AUDIT_v1.md');
  assert.equal(r.sha256,hash(content));assert.equal(written.length,1);
  assert.equal(r.deviceSync,'NOT_PROVEN');
});
test('replay skips same bytes with no second upload',async()=>{
  const {p,written}=mock();
  const a=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  const b=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(a.fileId,b.fileId);assert.equal(b.status,'VERIFIED_SKIP');
  assert.equal(b.driveUpload,'NOT_PERFORMED');assert.equal(written.length,1);
});
test('different content receives new version, not overwrite',async()=>{
  const {p,written}=mock();
  await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  const r=await deliverDriveArtifact({request,bytes:Buffer.from('other fixture'),provider:p,authorization:auth});
  assert.equal(r.status,'VERIFIED_CREATED');
  assert.equal(r.filename,'2026-11-21_TRUST_EXPOSURE_AUDIT_v2.md');
  assert.equal(written.length,2);
});
test('parallel same content calls serialized by exclusive lease',async()=>{
  const {p,written}=mock();
  const [a,b]=await Promise.all([1,2].map(()=>deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth})));
  assert.deepEqual([a.status,b.status].sort(),['VERIFIED_CREATED','VERIFIED_SKIP']);
  assert.equal(written.length,1);
});
test('Acode-only shared cannot receive general reports',async()=>{
  const {p,written}=mock();
  const r=await deliverDriveArtifact({request:{...request,scope:'ACODE',category:'ACODE_CODE',domain:'TRUST',extension:'sh'},
    bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'VERIFIED_CREATED');assert.equal(r.folderId,acodeFolder);
  assert.equal(written[0].fileName,'2026-11-21_TRUST_CHATGPT_EXPOSURE_AUDIT_v1.sh');
  const bad=await deliverDriveArtifact({request:{...request,scope:'ACODE'},bytes:content,provider:p,authorization:auth});
  assert.equal(bad.status,'HOLD');assert.equal(written.length,1);
});
test('invalid scope, file or authorization blocks before write',async()=>{
  const {p,written}=mock();
  for(const props of [
    {request:{...request,project:'DeviceCare-KI'}},
    {request:{...request,extension:'exe'}},
    {authorization:null},
    {authorization:{...auth,approved:false}},
    {bytes:Buffer.alloc(0)},
    {request:{...request,privacyReview:'NOT_PROVEN'}},
    {request:{...request,category:'OTHER'}},
  ]){
    const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth,...props});
    assert.equal(r.status,'HOLD');
  }
  assert.equal(written.length,0);
});
test('no authorized provider/lease fails closed',async()=>{
  const {p,written}=mock();delete p.withExclusiveCreateLease;
  const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'HOLD');assert.equal(written.length,0);
});
test('corrupt post-upload bytes never report VERIFIED upload',async()=>{
  const {p,written}=mock();p.readFileBytes=async()=>Buffer.from('tampered bytes');
  const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'HOLD');assert.equal(r.driveUpload,'NOT_PROVEN');
  assert.equal(r.sha256,'NOT_PROVEN');
  assert.equal(r.localSha256,hash(content));
  assert.equal(written.length,1);
});
test('cross-parent metadata rejects creation',async()=>{
  const {p,written,folders}=mock();
  folders.get(projectFolder).parents=['1WrongParentFixture'];
  const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'HOLD');assert.equal(written.length,0);
});
test('permission denied or incomplete listing stops before write',async()=>{
  for(const mutate of [
    p=>{p.assertCreateAuthorized=async()=>false;},
    p=>{p.listFolder=async()=>({files:[],nextPageToken:'1NextPageNeverFetched'});},
  ]){
    const {p,written}=mock();mutate(p);
    const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
    assert.equal(r.status,'HOLD');assert.equal(written.length,0);
  }
});
test('existing identical version reuses verified bytes',async()=>{
  const {p,records,written}=mock();
  records.set('1PreexistingFixtureFile',{id:'1PreexistingFixtureFile',
    name:'2026-11-21_TRUST_EXPOSURE_AUDIT_v1.md',parents:[projectFolder],bytes:content});
  const r=await deliverDriveArtifact({request,bytes:content,provider:p,authorization:auth});
  assert.equal(r.status,'VERIFIED_SKIP');assert.equal(written.length,0);
});
test('mutable caller buffers are snapshotted before asynchronous upload',async()=>{
  const {p,written}=mock();
  const input=Buffer.from('original bytes');
  const expected=hash(input);
  const pending=deliverDriveArtifact({request,bytes:input,provider:p,authorization:auth});
  input.fill(0);
  const r=await pending;
  assert.equal(r.status,'VERIFIED_CREATED');
  assert.equal(r.sha256,expected);
  assert.equal(hash(written[0].fileBytes),expected);
});
