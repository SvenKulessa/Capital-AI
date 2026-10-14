/** Owner-only architecture knowledge API. No public/customer/anonymous or ambient agent access. */
import { createHash } from 'node:crypto';
const BASE='/api/private/knowledge/';
const SHA=/^[a-f0-9]{64}$/;
async function bodyBytes(req,limit){
  const items=[]; let count=0;
  for await(const chunk of req){
    count+=chunk.length;
    if(count>limit) throw new Error('BODY_TOO_LARGE');
    items.push(chunk);
  }
  return Buffer.concat(items);
}
export function createPrivateKnowledgeApi({auth,vault}={}){
  return {
    async handle(req,res,url,json){
      if(!url.pathname.startsWith(BASE)) return false;
      res.setHeader('Cache-Control','private, no-store');
      res.setHeader('Referrer-Policy','no-referrer');
      res.setHeader('X-Content-Type-Options','nosniff');
      const user=await auth?.verify?.(req,res);
      if(!user?.userId||user.emailVerified!==true||
        !(await auth?.authorizeIamRole?.(req,res,'owner'))){
        json(res,403,{error:'owner_required'});return true;
      }
      const action=url.pathname.slice(BASE.length);
      if(action==='verify'&&req.method==='GET'){
        const result=await vault?.verify?.()??{available:false,reason:'PRIVATE_KNOWLEDGE_NOT_CONFIGURED'};
        json(res,result.available?200:503,{schema:'CAPITAL_AI_PRIVATE_KNOWLEDGE_API@1',
          ...result,slots:vault?.slots?.()??[],
          agentAccess:'NOT_CONFIGURED_OWNER_ONLY',publication:'DRAFT_ONLY'});
        return true;
      }
      if(action==='inventory'&&req.method==='GET'){
        try{json(res,200,{items:await vault.list(),agentAccess:'NOT_CONFIGURED_OWNER_ONLY'})}
        catch{json(res,503,{error:'knowledge_inventory_unavailable'})}
        return true;
      }
      const match=/^(import|restore|file|backup)\/([a-z-]+)\/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/.exec(action);
      if(!match){json(res,404,{error:'not_found'});return true}
      const [,operation,id,version]=match;
      if(!vault?.slots?.().some(x=>x.id===id)){json(res,404,{error:'not_found'});return true}
      if(['import','restore'].includes(operation)){
        if(req.method!=='POST'){json(res,405,{error:'method_not_allowed'});return true}
        if(!auth?.sameOrigin?.(req)){json(res,403,{error:'forbidden_origin'});return true}
        const contentType=operation==='import'?'text/markdown':'application/octet-stream';
        if(req.headers['content-type']!==contentType){json(res,415,{error:'unsupported_media_type'});return true}
        const digest=req.headers['x-knowledge-sha256'];
        if(typeof digest!=='string'||!SHA.test(digest)){
          json(res,400,{error:'invalid_digest'});return true;
        }
        try{
          const data=await bodyBytes(req,operation==='import'?524288:1048576);
          const result=operation==='import'?await vault.put(id,version,data,digest)
            :await vault.restore(id,version,data,digest);
          json(res,201,{stored:true,...result});
        }catch(error){
          json(res,error?.code==='EEXIST'?409:503,
            {error:error?.code==='EEXIST'?'immutable_version_exists':'knowledge_write_unavailable'});
        }
        return true;
      }
      if(req.method!=='GET'){json(res,405,{error:'method_not_allowed'});return true}
      try{
        if(operation==='file'){
          const object=await vault.read(id,version);
          const filename=id+'-v'+version+'.md';
          res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8',
            'Content-Disposition':'attachment; filename="'+filename+'"',
            'Content-Length':object.plaintext.length,'Cache-Control':'private, no-store',
            'X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox',
            'Referrer-Policy':'no-referrer','X-Knowledge-SHA256':object.meta.sha256});
          res.end(object.plaintext);
        }else{
          const object=await vault.backup(id,version);
          res.writeHead(200,{'Content-Type':'application/octet-stream',
            'Content-Disposition':'attachment; filename="'+object.filename+'"',
            'Content-Length':object.bytes.length,'Cache-Control':'private, no-store',
            'X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox',
            'Referrer-Policy':'no-referrer','X-Backup-SHA256':object.ciphertextSha256});
          res.end(object.bytes);
        }
      }catch{json(res,503,{error:'knowledge_read_unavailable'})}
      return true;
    }
  };
}
