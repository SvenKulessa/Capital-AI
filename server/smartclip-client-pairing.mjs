// Portable WEBSITE pairing candidate, not an installed Acode plugin or native OAuth client.
// Reuses the existing same-origin PKCE browser session. Never exports private key material.
const SKU='SMARTCLIP_PERSONAL', RELEASE='acode-bridge-v2', LICENSE='draft-v3';
const DIGEST='8c2683d641f28bf466026dff1f4adb0c073bc81564bc0afd4b758a33d7b76512';
const ORIGIN='https://capital-ai.online';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const encoder=new TextEncoder();

export async function createSmartclipIndexedDbStore(indexedDB) {
  if(!indexedDB||typeof indexedDB.open!=='function')throw Error('secure_storage_unavailable');
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('capital-ai-smartclip-device-v1',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('keys');
    req.onerror=()=>reject(Error('secure_storage_unavailable'));
    req.onblocked=()=>reject(Error('secure_storage_unavailable'));
    req.onsuccess=()=>resolve(req.result);
  });
  function action(mode,operation){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('keys',mode);
      const req=operation(tx.objectStore('keys'));
      tx.oncomplete=()=>resolve(req.result);
      tx.onabort=()=>reject(Error('secure_storage_unavailable'));
      tx.onerror=()=>reject(Error('secure_storage_unavailable'));
    });
  }
  return {get:id=>action('readonly',s=>s.get(id)),
    add:(id,pair)=>action('readwrite',s=>s.add(pair,id)),close:()=>db.close()};
}

export function createSmartclipPairingClient({userId,origin,cryptoImpl,store,fetchImpl}={}) {
  if(!UUID.test(userId||'')||origin!==ORIGIN||!cryptoImpl?.subtle||
     typeof store?.get!=='function'||typeof store?.add!=='function'||typeof fetchImpl!=='function')
    throw Error('pairing_context_unavailable');
  const id='smartclip:'+userId.toLowerCase()+':'+DIGEST;
  async function getKey(create){
    let pair=await store.get(id);
    if(!pair&&create){
      const generated=await cryptoImpl.subtle.generateKey({name:'Ed25519'},false,['sign','verify']);
      try{await store.add(id,generated);}catch{ /* concurrent creation: read back, never overwrite */ }
      pair=await store.get(id);
    }
    if(!pair||pair.privateKey?.type!=='private'||pair.privateKey.extractable!==false||
       pair.privateKey.algorithm?.name!=='Ed25519'||!pair.privateKey.usages.includes('sign')||
       pair.publicKey?.type!=='public'||pair.publicKey.algorithm?.name!=='Ed25519')
      throw Error('secure_key_unavailable');
    const raw=await cryptoImpl.subtle.exportKey('raw',pair.publicKey);
    const publicKey=hex(raw);
    if(!HEX.test(publicKey))throw Error('secure_key_unavailable');
    const fingerprint=hex(await cryptoImpl.subtle.digest('SHA-256',raw));
    return {pair,publicKey,fingerprint};
  }
  async function post(action,body){
    const response=await fetchImpl(ORIGIN+'/api/billing/smartclip-sandbox/device-'+action,{
      method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok)throw Error('pairing_denied');
    const result=await response.json();
    if(!result||result.testOnly!==true)throw Error('pairing_denied');
    return result;
  }
  return Object.freeze({
    async activate(){
      const {pair,publicKey,fingerprint}=await getKey(true);
      const issued=await post('challenge',{publicKey});
      if(!HEX.test(issued.challenge||'')||issued.expiresInSeconds!==120)throw Error('challenge_invalid');
      const message=['CAPITAL_AI_SMARTCLIP_DEVICE_TEST@1',userId,SKU,RELEASE,DIGEST,LICENSE,fingerprint,issued.challenge].join('|');
      if(issued.message!==message)throw Error('challenge_invalid');
      const signature=hex(await cryptoImpl.subtle.sign('Ed25519',pair.privateKey,encoder.encode(message)));
      const result=await post('activate',{publicKey,challenge:issued.challenge,signature});
      if(result.active!==true)throw Error('pairing_denied');
      return {active:true,testOnly:true};
    },
    async status(){
      const {publicKey}=await getKey(false);
      const result=await post('status',{publicKey});
      if(typeof result.active!=='boolean')throw Error('pairing_denied');
      return {active:result.active,testOnly:true};
    },
    async revoke(){
      const {publicKey}=await getKey(false);
      const result=await post('revoke',{publicKey});
      if(result.revoked!==true)throw Error('pairing_denied');
      return {revoked:true,testOnly:true};
    }
  });
}
