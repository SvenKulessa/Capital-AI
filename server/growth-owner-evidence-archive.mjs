// Explicit, owner-bound, encrypted append-only evidence storage. No database or provider calls.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, link, unlink, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
const SCHEMA='CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE@1';
const WORKSPACE='CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const CAP=5_000_000, FILE_CAP=7_000_000;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const domains=new Set(['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH']);
const states=new Set(['VERIFIED','BLOCKED','NOT_PROVEN']);
const fields=['id','name','domain','priority','status','endpoint','auth','flow','tests','error','dependencies','approvals','operation','next','evidence','origin'];
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
function parseWorkspace(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>CAP)throw Error('INVALID_WORKSPACE');
  const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!exact(raw,['schema','snapshots'])||raw.schema!==WORKSPACE||!Array.isArray(raw.snapshots)||raw.snapshots.length<1||raw.snapshots.length>30)throw Error('INVALID_WORKSPACE');
  let previous=0;
  for(const s of raw.snapshots){
    if(!exact(s,['version','at','rows'])||!Number.isSafeInteger(s.version)||s.version<=previous||
      typeof s.at!=='string'||!Number.isFinite(Date.parse(s.at))||new Date(s.at).toISOString()!==s.at||
      !Array.isArray(s.rows)||s.rows.length>100)throw Error('INVALID_SNAPSHOT');
    previous=s.version;const ids=new Set();
    for(const r of s.rows){
      if(!exact(r,fields)||typeof r.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(r.id)||ids.has(r.id)||
        typeof r.name!=='string'||r.name.length<1||r.name.length>120||!domains.has(r.domain)||!states.has(r.status)||
        !['P0','P1','P2'].includes(r.priority)||!['OWNER_NOTE','GA4_READBACK','GSC_READBACK'].includes(r.origin)||
        fields.slice(5,15).some(k=>typeof r[k]!=='string'||r[k].length>1000))throw Error('INVALID_ROW');
      // Archive is documentation, not a live provider attestation. Reject obvious credential material.
      if(fields.some(k=>/(?:Bearer\s+[A-Za-z0-9._-]{8,}|github_pat_|gh[pousr]_[A-Za-z0-9]{8,}|sk-(?:proj-)?[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[?&](?:access_token|api_key|client_secret)=)/i.test(r[k])))throw Error('SECRET_PATTERN');
      ids.add(r.id);
    }
  }
  return raw;
}
function keyFrom(hex,owner){
  if(!UUID.test(owner||'')||typeof hex!=='string'||!SHA.test(hex)||/^0{64}$/.test(hex))return null;
  return Buffer.from(hkdfSync('sha256',Buffer.from(hex,'hex'),Buffer.from(SCHEMA),Buffer.from(owner),32));
}
function seal(key,owner,plain){
  const workspace=parseWorkspace(plain), id=sha(plain),iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from([SCHEMA,owner,id].join('|')));
  const data=Buffer.concat([cipher.update(plain),cipher.final()]);
  const encrypted=Buffer.from(JSON.stringify({schema:SCHEMA,id,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}));
  return {id,encrypted,version:workspace.snapshots.at(-1).version};
}
function unseal(key,owner,id,encrypted){
  if(!SHA.test(id)||!Buffer.isBuffer(encrypted)||encrypted.length>FILE_CAP)throw Error('INVALID_ARCHIVE');
  const e=JSON.parse(encrypted.toString('utf8'));
  if(!exact(e,['schema','id','iv','tag','data'])||e.schema!==SCHEMA||e.id!==id||typeof e.iv!=='string'||typeof e.tag!=='string'||typeof e.data!=='string')throw Error('INVALID_ARCHIVE');
  const iv=Buffer.from(e.iv,'base64'),tag=Buffer.from(e.tag,'base64'),data=Buffer.from(e.data,'base64');
  if(iv.length!==12||tag.length!==16||data.length>CAP)throw Error('INVALID_ARCHIVE');
  const decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAAD(Buffer.from([SCHEMA,owner,id].join('|')));decipher.setAuthTag(tag);
  const plain=Buffer.concat([decipher.update(data),decipher.final()]);
  if(sha(plain)!==id)throw Error('INVALID_ARCHIVE');
  return {plain,workspace:parseWorkspace(plain)};
}
export function createGrowthEvidenceArchive({root='/var/data/capital-ai-growth-evidence',ownerId,keyHex}={}){
  const key=keyFrom(keyHex,ownerId),directory=resolve(root);
  const ready=async(create=false)=>{
    if(!key||directory==='/'||!UUID.test(ownerId||''))throw Error('ARCHIVE_UNAVAILABLE');
    const parent=await lstat(dirname(directory));
    if(!parent.isDirectory()||parent.isSymbolicLink())throw Error('ARCHIVE_UNAVAILABLE');
    if(create)await mkdir(directory,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e});
    const st=await lstat(directory);
    if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)throw Error('ARCHIVE_UNAVAILABLE');
  };
  const filename=id=>{if(!SHA.test(id||''))throw Error('INVALID_ID');return join(directory,id+'.caige');};
  async function read(id){
    await ready();const path=filename(id),st=await lstat(path);
    if(!st.isFile()||st.isSymbolicLink()||st.size>FILE_CAP||(st.mode&0o077)!==0)throw Error('INVALID_ARCHIVE');
    const fd=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
    try{
      const before=await fd.stat();if(before.ino!==st.ino||before.dev!==st.dev||before.size!==st.size)throw Error('INVALID_ARCHIVE');
      const encrypted=await fd.readFile();const after=await fd.stat();
      if(encrypted.length!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error('INVALID_ARCHIVE');
      return {...unseal(key,ownerId,id,encrypted),encrypted};
    }finally{await fd.close();}
  }
  async function write(id,encrypted){
    const verified=unseal(key,ownerId,id,encrypted);await ready(true);
    const entries=await readdir(directory);
    if(entries.length>=128&&!entries.includes(id+'.caige'))throw Error('ARCHIVE_LIMIT');
    const target=filename(id),tmp=join(directory,'.tmp-'+randomBytes(16).toString('hex'));
    let fd;
    try{
      fd=await open(tmp,'wx',0o600);await fd.writeFile(encrypted);await fd.sync();await fd.close();fd=null;
      try{await link(tmp,target);}catch(e){if(e.code!=='EEXIST')throw e;await read(id);}
      const dirfd=await open(directory,constants.O_RDONLY|(constants.O_DIRECTORY||0));try{await dirfd.sync();}finally{await dirfd.close();}
    }finally{if(fd)await fd.close();await unlink(tmp).catch(()=>{});}
    return {id,version:verified.workspace.snapshots.at(-1).version,archived:true,authority:'DOCUMENTATION_ONLY'};
  }
  return Object.freeze({
    configured:()=>Boolean(key),
    async put(bytes){if(!key)throw Error('ARCHIVE_UNAVAILABLE');const s=seal(key,ownerId,bytes);return write(s.id,s.encrypted);},
    async read(id){const r=await read(id);return r.plain;},
    async backup(id){const r=await read(id);return r.encrypted;},
    async restore(id,bytes){if(!key)throw Error('ARCHIVE_UNAVAILABLE');return write(id,bytes);},
    async list(){
      if(!key)throw Error('ARCHIVE_UNAVAILABLE');
      try{await ready();}catch(e){if(e.code==='ENOENT')return [];throw e;}
      const names=await readdir(directory);
      if(names.length>128)throw Error('ARCHIVE_LIMIT');
      const items=[];
      for(const n of names.filter(n=>/^[a-f0-9]{64}\.caige$/.test(n))){
        const id=n.slice(0,64),r=await read(id),s=r.workspace.snapshots.at(-1);
        items.push({id,version:s.version,at:s.at});
      }
      return items.sort((a,b)=>b.at.localeCompare(a.at)||b.id.localeCompare(a.id));
    },
  });
}
