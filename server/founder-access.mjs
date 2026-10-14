/** Founder access boundary. Only verified server session + explicit UUID invitation or IAM owner. */
const ROUTE='/api/private/founder/access';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function allowlist(raw){
 if(raw===undefined||raw==='')return new Set();
 if(typeof raw!=='string'||raw.length>4096)return null;
 const values=raw.split(',').map(x=>x.trim().toLowerCase());
 if(values.length>50||values.some(x=>!UUID.test(x))||new Set(values).size!==values.length)return null;
 return new Set(values);
}
export function createFounderAccess({auth,env=process.env}={}){
 const sponsors=allowlist(env.FOUNDER_SPONSOR_USER_IDS);
 const investors=allowlist(env.FOUNDER_INVESTOR_USER_IDS);
 return {async handle(req,res,url,json){
  if(url.pathname!==ROUTE)return false;
  for(const [name,value] of Object.entries({'Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}))res.setHeader(name,value);
  if(req.method!=='GET'){res.setHeader('Allow','GET');json(res,405,{error:'method_not_allowed'});return true}
  if(!sponsors||!investors){json(res,503,{error:'founder_access_configuration_invalid'});return true}
  const user=await auth?.verify?.(req,res);
  if(!UUID.test(user?.userId||'')||user?.emailVerified!==true){json(res,403,{error:'founder_access_denied'});return true}
  const owner=(await auth?.authorizeIamRole?.(req,res,'owner'))===true;
  const sections=[];
  if(owner||sponsors.has(user.userId.toLowerCase()))sections.push('sponsoring');
  if(owner||investors.has(user.userId.toLowerCase()))sections.push('investor-relations');
  if(!sections.length){json(res,403,{error:'founder_access_denied'});return true}
  json(res,200,{schema:'CAPITAL_AI_FOUNDER_ACCESS@1',authorized:true,role:owner?'owner':'invited_partner',
    sections,privateMaterialsAvailable:false,commercialOffer:'NOT_PUBLISHED'});
  return true;
 }};
}
