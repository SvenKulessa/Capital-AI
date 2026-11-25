import { createGrowthEvidenceArchive } from './growth-owner-evidence-archive.mjs';
const PATH='/api/profile/growth-intelligence/evidence-history';
const SHA=/^[a-f0-9]{64}$/;
async function body(req,limit){
  const chunks=[];let size=0;
  for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(bytes);}
  return Buffer.concat(chunks);
}
export function createGrowthEvidenceApi({env=process.env,auth,authorized,archive}={}){
  const enabled=env.CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE_ENABLED==='true';
  const recovery=env.CAPITAL_AI_GROWTH_EVIDENCE_RECOVERY_VERIFIED==='true';
  const store=archive??createGrowthEvidenceArchive({ownerId:env.CAPITAL_AI_RENDER_OWNER_USER_ID,keyHex:env.BLUEPRINT_DISK_ENCRYPTION_KEY});
  let writing=false;
  return {async handle(req,res,url,json){
    if(url.pathname!==PATH&&!url.pathname.startsWith(PATH+'/'))return false;
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    if(!await authorized?.(req,res)){json(res,404,{error:'not_found'});return true;}
    if(!enabled||!recovery||!store.configured()){json(res,503,{status:'BLOCKED',reason:'ARCHIVE_ACTIVATION_OR_RECOVERY_NOT_VERIFIED'});return true;}
    const suffix=url.pathname.slice(PATH.length);
    if(suffix===''&&req.method==='GET'){
      try{json(res,200,{schema:'CAPITAL_AI_GROWTH_EVIDENCE_ARCHIVE@1',private:true,authority:'DOCUMENTATION_ONLY',items:await store.list()});}
      catch{json(res,503,{error:'archive_unavailable'});}return true;
    }
    const item=/^\/(file|backup|restore)\/([a-f0-9]{64})$/.exec(suffix);
    if(req.method==='GET'&&item&&item[1]!=='restore'){
      try{
        const bytes=item[1]==='file'?await store.read(item[2]):await store.backup(item[2]);
        res.writeHead(200,{'Content-Type':item[1]==='file'?'application/json':'application/octet-stream','Content-Disposition':'attachment; filename="'+item[2]+(item[1]==='file'?'.json':'.caige')+'"','Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'});res.end(bytes);
      }catch{json(res,404,{error:'archive_unavailable'});}return true;
    }
    if(req.method!=='POST'||(suffix!==''&&item?.[1]!=='restore')){json(res,405,{error:'method_not_allowed'});return true;}
    if(!auth?.sameOrigin?.(req)){json(res,403,{error:'forbidden_origin'});return true;}
    const restore=item?.[1]==='restore';
    if(req.headers['content-type']!==(restore?'application/octet-stream':'application/json')){json(res,415,{error:'unsupported_media_type'});return true;}
    if(writing){json(res,409,{error:'archive_busy'});return true;}
    writing=true;
    try{
      const bytes=await body(req,restore?7_000_000:5_000_000);
      const result=restore?await store.restore(item[2],bytes):await store.put(bytes);
      json(res,201,result);
    }catch{json(res,422,{error:'archive_write_rejected'});}finally{writing=false;}
    return true;
  }};
}
