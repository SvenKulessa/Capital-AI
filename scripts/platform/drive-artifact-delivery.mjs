/**
 * CAPITAL_AI_DRIVE_ARTIFACT_DELIVERY@1
 * Trusted, injected Drive connector. No credentials, HTTP client, scheduler or implicit sync.
 * Only new-file creation; no update, move, delete or overwrite API.
 */
import { createHash } from 'node:crypto';
import { planDriveArtifact } from './drive-artifact-router.mjs';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_PAGES = 100;
const ID = /^[A-Za-z0-9_-]{10,120}$/;
const MIME = Object.freeze({
  md:'text/markdown',txt:'text/plain',json:'application/json',jsonl:'application/x-ndjson',
  csv:'text/csv',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',
  jpeg:'image/jpeg',svg:'image/svg+xml',webp:'image/webp',html:'text/html',
  sh:'text/x-shellscript',py:'text/x-python',mjs:'text/javascript',js:'text/javascript',
  zip:'application/zip',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});
const deny = (reason, other={}) => ({
  status:'HOLD',reason,route:'NOT_PROVEN',driveUpload:'NOT_PROVEN',
  driveParent:'NOT_PROVEN',sha256:'NOT_PROVEN',deviceSync:'NOT_PROVEN',...other,
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const bytesOk = bytes => bytes instanceof Uint8Array && bytes.length>0 && bytes.length<=MAX_BYTES;
function fail(code){ throw new Error(code); }
function validId(value){ return typeof value==='string' && ID.test(value); }
function validName(value){ return typeof value==='string' && value.length>0 && value.length<=240 && !/[\\/\0]/.test(value); }
function verifyFile(meta,id,name,parent){
  if(!meta || meta.id!==id || meta.name!==name || meta.trashed===true ||
     !Array.isArray(meta.parents) || meta.parents.length!==1 || meta.parents[0]!==parent)
    fail('REMOTE_FILE_IDENTITY_MISMATCH');
}
async function verifyFolder(provider,path,scope){
  const segments=path.split('/');
  const leafId=await provider.resolveFolderId(path);
  if(!validId(leafId)) fail('FOLDER_UNRESOLVED');
  let current=leafId;
  for(let i=segments.length-1;i>=0;i--){
    const meta=await provider.getFolder(current);
    if(!meta || meta.id!==current || meta.name!==segments[i] || meta.mimeType!==FOLDER_MIME ||
       meta.trashed===true || !Array.isArray(meta.parents) || meta.parents.length>1 ||
       (i>0 && meta.parents.length!==1)) fail('FOLDER_CHAIN_MISMATCH');
    if(i===segments.length-1 && meta.capabilities?.canAddChildren!==true)
      fail('CREATE_PERMISSION_NOT_PROVEN');
    if(i===0 && meta.id!==provider.authorizedRoots?.[scope]) fail('ROOT_AUTHORITY_MISMATCH');
    if(i>0)current=meta.parents[0];
  }
  return leafId;
}
async function listComplete(provider,folderId){
  let token=null;
  const seen=new Set(), files=[], names=new Set(), ids=new Set();
  for(let page=0;page<MAX_PAGES;page++){
    const result=await provider.listFolder({folderId,pageToken:token});
    if(!result || !Array.isArray(result.files) || !Object.hasOwn(result,'nextPageToken') ||
       (result.nextPageToken!==null && !validId(result.nextPageToken)))
      fail('LISTING_INCOMPLETE');
    for(const f of result.files){
      if(!validId(f.id)||!validName(f.name)||f.parentId!==folderId||
         ids.has(f.id)||names.has(f.name.toLowerCase()))fail('FOLDER_LISTING_INCONSISTENT');
      ids.add(f.id);names.add(f.name.toLowerCase());files.push({id:f.id,name:f.name});
    }
    if(result.nextPageToken===null)return files;
    if(result.nextPageToken===token||seen.has(result.nextPageToken))fail('PAGINATION_CYCLE');
    seen.add(result.nextPageToken);token=result.nextPageToken;
  }
  fail('PAGINATION_LIMIT');
}
async function compareRemote(provider,file,folderId,hash){
  const meta=await provider.getFile(file.id);
  verifyFile(meta,file.id,file.name,folderId);
  const remote=await provider.readFileBytes(file.id);
  if(!bytesOk(remote))fail('REMOTE_BYTES_UNAVAILABLE');
  return digest(remote)===hash;
}
/**
 * Provider ports: assertCreateAuthorized, resolveFolderId, getFolder, listFolder,
 * getFile, readFileBytes, uploadNewFile and withExclusiveCreateLease.
 * The lease must serialize ALL authorized writers, not merely one JS process.
 */
export async function deliverDriveArtifact({request,bytes,provider,authorization}={}){
  if(!request || request.project!=='CAPITAL-AI')return deny('PROJECT_SCOPE_MISMATCH');
  if(!bytesOk(bytes))return deny('INVALID_OR_OVERSIZED_BYTES');
  if(!authorization || authorization.project!=='CAPITAL-AI' ||
     authorization.operation!=='CREATE_ONLY' || authorization.approved!==true)
    return deny('CREATE_AUTHORIZATION_REQUIRED');
  const required=['assertCreateAuthorized','resolveFolderId','getFolder','listFolder',
    'getFile','readFileBytes','uploadNewFile','withExclusiveCreateLease'];
  if(!provider || required.some(key=>typeof provider[key]!=='function'))
    return deny('TRUSTED_PROVIDER_PORT_UNAVAILABLE');
  if(!MIME[request.extension])return deny('UNSUPPORTED_FILE_MIME');
  const preliminary=planDriveArtifact({...request,existingNames:[],listingComplete:false});
  if(preliminary.status==='BLOCKED')return deny(preliminary.reason);
  const route=preliminary.driveFolder;
  if(typeof route!=='string')return deny('ROUTING_FAILED');
  const hash=digest(bytes);
  const scope=request.scope==='ACODE'?'ACODE':'PROJECT';
  const lockKey='CAPITAL-AI/'+route+'/'+request.category+'/'+request.topic;
  try{
    if(await provider.assertCreateAuthorized({project:'CAPITAL-AI',scope,folderPath:route})!==true)
      return deny('DRIVE_PERMISSION_DENIED');
    return await provider.withExclusiveCreateLease(lockKey,async()=>{
      const folderId=await verifyFolder(provider,route,scope);
      const listed=await listComplete(provider,folderId);
      const planned=planDriveArtifact({
        ...request, existingNames:listed.map(f=>f.name),listingComplete:true,
        providerFolderId:folderId,listedParentId:folderId,listedFolderPath:route,
        parentChainVerified:true,
      });
      if(planned.status!=='ROUTE_READY'||planned.folderId!==folderId)
        return deny('ROUTING_READBACK_FAILED');
      const marker=planned.filename.lastIndexOf('_v');
      if(marker<0) return deny('INVALID_GENERATED_FILENAME');
      const prefix=planned.filename.slice(0,marker+2);
      const escaped=request.extension.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const rx=new RegExp('^[1-9][0-9]*(?:\\.[0-9]+)?\\.'+escaped+'$');
      // Verify contents of prior versions: replay = verified skip, not duplicate upload.
      for(const file of listed){
        if(!file.name.startsWith(prefix)||!rx.test(file.name.slice(prefix.length)))continue;
        if(await compareRemote(provider,file,folderId,hash)){
          return {status:'VERIFIED_SKIP',filename:file.name,fileId:file.id,folderId,
            sha256:hash,route:'VERIFIED',driveParent:'VERIFIED',driveUpload:'NOT_PERFORMED',
            contentReadback:'VERIFIED',deviceSync:'NOT_PROVEN'};
        }
      }
      if(listed.some(f=>f.name.toLowerCase()===planned.filename.toLowerCase()))
        return deny('EXACT_NAME_COLLISION');
      const uploaded=await provider.uploadNewFile({
        parentFolderId:folderId,fileName:planned.filename,fileBytes:bytes,
        mimeType:MIME[request.extension],mode:'CREATE_ONLY',sha256:hash
      });
      if(!uploaded || !validId(uploaded.id))return deny('UPLOAD_RESULT_UNVERIFIED',
        {route:'VERIFIED',sha256:hash});
      const meta=await provider.getFile(uploaded.id);
      verifyFile(meta,uploaded.id,planned.filename,folderId);
      const remoteBytes=await provider.readFileBytes(uploaded.id);
      if(!bytesOk(remoteBytes)||digest(remoteBytes)!==hash)
        return deny('POST_UPLOAD_CONTENT_MISMATCH',{fileId:uploaded.id,route:'VERIFIED',
          driveUpload:'NOT_PROVEN',driveParent:'VERIFIED',sha256:hash});
      const after=await listComplete(provider,folderId);
      if(after.filter(f=>f.name.toLowerCase()===planned.filename.toLowerCase()).length!==1 ||
         !after.some(f=>f.id===uploaded.id && f.name===planned.filename))
        return deny('POST_UPLOAD_DUPLICATE_OR_MISSING',{fileId:uploaded.id,route:'VERIFIED',
          driveUpload:'NOT_PROVEN',driveParent:'VERIFIED',sha256:hash});
      return {status:'VERIFIED_CREATED',filename:planned.filename,fileId:uploaded.id,
        folderId,sha256:hash,route:'VERIFIED',driveUpload:'VERIFIED',
        driveParent:'VERIFIED',contentReadback:'VERIFIED',deviceSync:'NOT_PROVEN'};
    });
  }catch{
    // Do not leak provider errors/tokens or retry a potentially completed write.
    return deny('CONNECTOR_OR_EXCLUSIVE_LEASE_FAILED',{sha256:hash});
  }
}