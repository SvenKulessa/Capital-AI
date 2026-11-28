// Server-only durable Drive lock. Reuse the existing Supabase service identity.
// No auto-expiry: Google Drive cannot fence an abandoned writer.
import { randomUUID } from 'node:crypto';
import { boundedJson, secureUrl } from '../../server/http-security.mjs';
import { DRIVE_CREATE_LEASE_KEY } from './drive-artifact-delivery.mjs';

export function createSupabaseDriveLease({enabled=false,env=process.env,fetchImpl=fetch}={}){
  let config;
  try {
    const url=secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key=String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '');
    const parts=key.split('.');
    const admin=(key.startsWith('sb_secret_') && key.length>10) ||
      (parts.length===3 && JSON.parse(Buffer.from(parts[1],'base64url')).role==='service_role');
    if(enabled===true && admin && url.href===url.origin+'/' &&
       /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) && !url.port)config={origin:url.origin,key};
  } catch { /* fail closed */ }
  async function rpc(name,owner){
    if(!config)throw Error('DRIVE_LEASE_DISABLED_OR_UNCONFIGURED');
    try {
      const headers={'Content-Type':'application/json',Accept:'application/json',apikey:config.key};
      if(!config.key.startsWith('sb_secret_'))headers.Authorization='Bearer '+config.key;
      const response=await fetchImpl(config.origin+'/rest/v1/rpc/'+name,{
        method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(5000),
        body:JSON.stringify({_owner:owner}),
      });
      const result=await boundedJson(response,1024);
      if(typeof result!=='boolean')throw Error('INVALID_RESPONSE');
      return result;
    }catch{throw Error('DRIVE_LEASE_RPC_UNCERTAIN');}
  }
  async function withExclusiveCreateLease(key,fn){
    if(key!==DRIVE_CREATE_LEASE_KEY || typeof fn!=='function')throw Error('DRIVE_LEASE_SCOPE');
    const owner=randomUUID();
    if(!await rpc('capital_ai_drive_lock_acquire',owner))throw Error('DRIVE_LEASE_BUSY');
    let writeAttempted=false,closed=false;
    const lease=Object.freeze({async beforeCreate(){
      if(closed || writeAttempted)throw Error('DRIVE_LEASE_WRITE_STATE');
      // Commit a durable intent before the external request. If the RPC is
      // uncertain, keep the row even though no Drive write is initiated.
      writeAttempted=true;
      if(!await rpc('capital_ai_drive_lock_mark_write',owner))throw Error('DRIVE_LEASE_OWNER_LOST');
    }});
    let result;
    try { result=await fn(lease); }
    finally {
      closed=true;
      // Unknown/failed external write keeps its durable lock for recovery.
      // A pre-write error is safe to release; a verified create/skip is safe.
      if(!writeAttempted || result?.status==='VERIFIED_CREATED'){
        if(!await rpc('capital_ai_drive_lock_release',owner))throw Error('DRIVE_LEASE_RELEASE_UNCERTAIN');
      }
    }
    return result;
  }
  return {withExclusiveCreateLease};
}

// Preserve all existing Drive provider identity and method bindings.
export function bindSupabaseDriveLease(provider,options){
  const ports=['assertCreateAuthorized','resolveFolderId','getFolder','listFolder',
    'getFile','readFileBytes','uploadNewFile'];
  if(!provider || ports.some(k=>typeof provider[k]!=='function'))throw Error('DRIVE_PROVIDER_INCOMPLETE');
  return Object.freeze({authorizedRoots:provider.authorizedRoots,
    ...Object.fromEntries(ports.map(k=>[k,provider[k].bind(provider)])),
    ...createSupabaseDriveLease(options)});
}
