import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { constants, lstatSync, realpathSync, openSync, fstatSync, readSync, closeSync, readdirSync, writeFileSync, fsyncSync, renameSync, unlinkSync } from 'node:fs';
import { isAbsolute, resolve, join } from 'node:path';
const SCHEMA='CAPITAL_AI_VIRAL_TEMPLATE_CACHE@1', TTL=600000, CAP=65536, LIMIT=64;
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
// Optional operator-local cache. Never initialize a production directory or reuse the evidence archive.
export function createViralTemplateDiskCache({root,ownerId,keyHex}={}) {
  if(typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root||root==='/'||!UUID.test(ownerId||'')||typeof keyHex!=='string'||!HEX.test(keyHex)||/^0{64}$/.test(keyHex)||typeof process.getuid!=='function')throw Error('VIRAL_CACHE_CONFIG_INVALID');
  const key=Buffer.from(hkdfSync('sha256',Buffer.from(keyHex,'hex'),Buffer.from(SCHEMA),Buffer.from(ownerId),32));
  const uid=process.getuid();
  const ready=()=>{const s=lstatSync(root);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o777)!==0o700||s.uid!==uid||realpathSync(root)!==root)throw Error('VIRAL_CACHE_DIRECTORY_UNSAFE');};
  ready();
  const file=id=>{if(typeof id!=='string'||!HEX.test(id))throw Error('VIRAL_CACHE_ID_INVALID');return join(root,id+'.vpc');};
  const aad=id=>Buffer.from(JSON.stringify([SCHEMA,ownerId,id]));
  function read(id,now){
    if(!Number.isSafeInteger(now)||now<0)return null;
    let fd;
    try{
      ready();const path=file(id),before=lstatSync(path);
      if(!before.isFile()||before.isSymbolicLink()||before.uid!==uid||(before.mode&0o777)!==0o600||before.size<1||before.size>CAP)return null;
      fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);const st=fstatSync(fd);
      if(st.ino!==before.ino||st.dev!==before.dev||st.size!==before.size)return null;
      const buf=Buffer.alloc(st.size);let n=0;while(n<buf.length){const count=readSync(fd,buf,n,buf.length-n,null);if(!count)return null;n+=count;}
      const after=fstatSync(fd);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs)return null;
      const envelope=JSON.parse(buf.toString('utf8'));if(!exact(envelope,['schema','iv','tag','data'])||envelope.schema!==SCHEMA)return null;
      if(![envelope.iv,envelope.tag,envelope.data].every(v=>typeof v==='string'))return null;
      const iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64');if(iv.length!==12||tag.length!==16)return null;
      const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad(id));cipher.setAuthTag(tag);
      const value=JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.data,'base64')),cipher.final()]).toString('utf8'));
      if(!exact(value,['created','assets'])||!Number.isSafeInteger(value.created)||value.created<0||now<value.created||now-value.created>TTL||!exact(value.assets,['x_post','instagram_carousel','short_form_video','youtube_long_form']))return null;
      return value;
    }catch{return null;}finally{if(fd!==undefined)closeSync(fd);}
  }
  function write(id,now,assets){
    if(!Number.isSafeInteger(now)||now<0||!exact(assets,['x_post','instagram_carousel','short_form_video','youtube_long_form']))return false;
    let tmp,fd,lockFd;const lock=join(root,'.vpc-lock');
    try{
      ready();const target=file(id);lockFd=openSync(lock,'wx',0o600);
      const names=readdirSync(root).filter(n=>n!=='.vpc-lock');if(names.some(n=>!(/^[a-f0-9]{64}\.vpc$/).test(n))||(names.length>=LIMIT&&!names.includes(id+'.vpc')))return false;
      const plain=Buffer.from(JSON.stringify({created:now,assets}));if(plain.length>CAP/2)return false;
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad(id));
      const data=Buffer.concat([cipher.update(plain),cipher.final()]);const bytes=Buffer.from(JSON.stringify({schema:SCHEMA,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}));if(bytes.length>CAP)return false;
      tmp=join(root,'.vpc-tmp-'+randomBytes(16).toString('hex'));fd=openSync(tmp,'wx',0o600);writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(tmp,target);tmp=undefined;return true;
    }catch{return false;}finally{if(fd!==undefined)closeSync(fd);if(tmp)try{unlinkSync(tmp);}catch{}if(lockFd!==undefined){closeSync(lockFd);try{unlinkSync(lock);}catch{}}}
  }
  return Object.freeze({read,write});
}
