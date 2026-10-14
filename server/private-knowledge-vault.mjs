/**
 * Private, append-only architecture knowledge vault on the existing Render disk.
 * Internal concepts are NOT commerce artefacts and never inherit buyer entitlements.
 */
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, link, unlink, statfs, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const ROOT = '/var/data/capital-ai-private-knowledge';
const SCHEMA = 'CAPITAL_AI_PRIVATE_KNOWLEDGE@1';
const CAP = 524288;
const VERSION = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
const SHA = /^[a-f0-9]{64}$/;
const SLOTS = Object.freeze({
  'architecture-glossary': 'ARCHITECTURE_GLOSSARY',
  'single-maintainer-agent': 'SINGLE_MAINTAINER_AGENT_ENGINEERING',
  'mobile-architecture': 'MOBILE_SEPARATE_REPOSITORY_ARCHITECTURE',
  'social-blog-playbook': 'SOCIAL_BLOG_TEMPLATES',
});
const sha = b => createHash('sha256').update(b).digest('hex');
const valid = (id,version) => {
  if (!Object.hasOwn(SLOTS,id) || !VERSION.test(version ?? '')) throw new Error('KNOWLEDGE_ID_INVALID');
};
const pathName = (id,version) => id + '-v' + version + '.caikb';
function keyFrom(hex) {
  if (typeof hex !== 'string' || !SHA.test(hex) || /^0{64}$/.test(hex)) return null;
  return Buffer.from(hkdfSync('sha256', Buffer.from(hex,'hex'),
    Buffer.from('CAPITAL_AI_DISK_KEY_DERIVATION@1'), Buffer.from('PRIVATE_ARCHITECTURE_KNOWLEDGE'), 32));
}
function markdown(data) {
  if (!Buffer.isBuffer(data) || data.length < 64 || data.length > CAP || data.includes(0))
    throw new Error('KNOWLEDGE_DOCUMENT_INVALID');
  try {
    const text = new TextDecoder('utf-8',{fatal:true}).decode(data);
    if (!text.trimStart().startsWith('# ')) throw new Error('KNOWLEDGE_DOCUMENT_INVALID');
  } catch { throw new Error('KNOWLEDGE_DOCUMENT_INVALID'); }
}
function encrypt(key,id,version,plaintext,digest) {
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from([SCHEMA,id,version,digest].join('|')));
  const content=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return Buffer.from(JSON.stringify({schema:SCHEMA,id,category:SLOTS[id],version,
    sha256:digest,bytes:plaintext.length,iv:iv.toString('base64'),
    tag:cipher.getAuthTag().toString('base64'),content:content.toString('base64')}));
}
function decrypt(key,id,version,bytes,expected) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 140 || bytes.length > CAP*2) throw new Error('KNOWLEDGE_CIPHER_INVALID');
  let record;
  try {record=JSON.parse(bytes.toString('utf8'))}catch{throw new Error('KNOWLEDGE_CIPHER_INVALID')}
  if (record?.schema!==SCHEMA || record.id!==id || record.category!==SLOTS[id] ||
    record.version!==version || !SHA.test(record.sha256||'') ||
    (expected && record.sha256!==expected) ||
    !Number.isSafeInteger(record.bytes) || record.bytes<64 || record.bytes>CAP ||
    typeof record.content!=='string'||typeof record.iv!=='string'||typeof record.tag!=='string')
    throw new Error('KNOWLEDGE_IDENTITY_INVALID');
  const iv=Buffer.from(record.iv,'base64'),tag=Buffer.from(record.tag,'base64'),content=Buffer.from(record.content,'base64');
  if (iv.length!==12||tag.length!==16||content.length!==record.bytes) throw new Error('KNOWLEDGE_CIPHER_INVALID');
  let plaintext;
  try{
    const decipher=createDecipheriv('aes-256-gcm',key,iv);
    decipher.setAAD(Buffer.from([SCHEMA,id,version,record.sha256].join('|')));
    decipher.setAuthTag(tag);
    plaintext=Buffer.concat([decipher.update(content),decipher.final()]);
  }catch{throw new Error('KNOWLEDGE_AUTH_INVALID')}
  markdown(plaintext);
  if (sha(plaintext)!==record.sha256) throw new Error('KNOWLEDGE_HASH_INVALID');
  return {plaintext,meta:{id,category:SLOTS[id],version,sha256:record.sha256,bytes:record.bytes}};
}
async function safeRead(filename) {
  const st=await lstat(filename);
  if (!st.isFile()||st.isSymbolicLink()||st.size>CAP*2) throw new Error('KNOWLEDGE_FILE_INVALID');
  const fd=await open(filename, constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const st2=await fd.stat();
    if (!st2.isFile()||st2.ino!==st.ino||st2.dev!==st.dev||st2.size!==st.size) throw new Error('KNOWLEDGE_FILE_CHANGED');
    const data=await fd.readFile();
    const st3=await fd.stat();
    if (data.length!==st2.size||st3.mtimeMs!==st2.mtimeMs||st3.size!==st2.size) throw new Error('KNOWLEDGE_FILE_CHANGED');
    return data;
  }finally{await fd.close()}
}
export function createPrivateKnowledgeVault({root=ROOT,keyHex=process.env.BLUEPRINT_DISK_ENCRYPTION_KEY}={}){
  const directory=resolve(root),key=keyFrom(keyHex);
  if (!directory.startsWith('/')||directory==='/') throw new Error('KNOWLEDGE_ROOT_INVALID');
  async function ready(){
    if(!key) throw new Error('KNOWLEDGE_KEY_REQUIRED');
    const p=await lstat(dirname(directory));
    if(!p.isDirectory()||p.isSymbolicLink()) throw new Error('KNOWLEDGE_MOUNT_UNAVAILABLE');
    await mkdir(directory,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e});
    const st=await lstat(directory);
    if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)
      throw new Error('KNOWLEDGE_DIRECTORY_PERMISSIONS_INVALID');
  }
  async function putCipher(id,version,bytes,digest){
    valid(id,version);
    const obj=decrypt(key,id,version,bytes,digest);
    await ready();
    const target=join(directory,pathName(id,version));
    const tmp=join(directory,'.write-'+randomBytes(16).toString('hex'));
    let fd;
    try{
      fd=await open(tmp,'wx',0o600);
      await fd.writeFile(bytes); await fd.sync(); await fd.close();fd=null;
      await link(tmp,target); // O_EXCL semantics: never overwrite an existing version
      const dirfd=await open(directory,constants.O_RDONLY|(constants.O_DIRECTORY||0));
      try{await dirfd.sync()}finally{await dirfd.close()}
    }finally{
      if(fd)await fd.close();
      await unlink(tmp).catch(()=>{});
    }
    return {...obj.meta,ciphertextSha256:sha(bytes)};
  }
  return Object.freeze({
    configured:()=>Boolean(key),
    slots:()=>Object.entries(SLOTS).map(([id,category])=>({id,category})),
    async verify(){
      try{
        await ready();
        const probe=join(directory,'.probe-'+randomBytes(16).toString('hex'));
        const fd=await open(probe,'wx',0o600);
        try{await fd.sync()}finally{await fd.close();await unlink(probe)}
        const fs=await statfs(directory);
        return {available:true,encrypted:true,writable:true,freeBytes:fs.bavail*fs.bsize,
          persistentAcrossDeploys:'NOT_PROVEN',driveBackup:'NOT_PROVEN'};
      }catch{
        return {available:false,encrypted:false,writable:false,reason:key?'DISK_OR_PERMISSIONS_UNAVAILABLE':'ENCRYPTION_KEY_REQUIRED',
          persistentAcrossDeploys:'NOT_PROVEN',driveBackup:'NOT_PROVEN'};
      }
    },
    async put(id,version,plaintext,digest){
      valid(id,version);
      if(!key) throw new Error('KNOWLEDGE_KEY_REQUIRED');
      markdown(plaintext);
      if (!SHA.test(digest||'')||sha(plaintext)!==digest) throw new Error('KNOWLEDGE_HASH_INVALID');
      return putCipher(id,version,encrypt(key,id,version,plaintext,digest),digest);
    },
    async restore(id,version,ciphertext,digest){
      valid(id,version);
      if(!key) throw new Error('KNOWLEDGE_KEY_REQUIRED');
      if(!SHA.test(digest||'')) throw new Error('KNOWLEDGE_HASH_INVALID');
      return putCipher(id,version,ciphertext,digest);
    },
    async read(id,version){
      valid(id,version);await ready();
      const data=await safeRead(join(directory,pathName(id,version)));
      return decrypt(key,id,version,data);
    },
    async backup(id,version){
      valid(id,version);await ready();
      const ciphertext=await safeRead(join(directory,pathName(id,version)));
      const item=decrypt(key,id,version,ciphertext);
      return {bytes:ciphertext,ciphertextSha256:sha(ciphertext),...item.meta,
        filename:pathName(id,version)};
    },
    async list(){
      await ready();
      const files=await readdir(directory);
      if(files.length>1024) throw new Error('KNOWLEDGE_INVENTORY_TOO_LARGE');
      const records=[];
      for(const filename of files.sort()){
        const match=/^([a-z-]+)-v([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.caikb$/.exec(filename);
        if(!match || !Object.hasOwn(SLOTS,match[1])) continue;
        // A corrupt or symlinked private concept fails the whole readback; never hide it.
        const raw=await safeRead(join(directory,filename));
        records.push(decrypt(key,match[1],match[2],raw).meta);
      }
      return records;
    },
  });
}
