import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sha=/^[a-f0-9]{64}$/;
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(v);
const exact=(v,keys)=>v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).length===keys.length && keys.every(k=>Object.hasOwn(v,k));
const date=v=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;
const url=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&u.hostname.includes('.')&&!u.hostname.endsWith('.local')&&/^[a-z][a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)&&u.href===v;}catch{return false;}};
const short=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n&&v===v.trim()&&!/[\x00-\x1f\x7f<>]/.test(v)&&!/(?:bearer\s|api[_ -]?key\s*[=:]|password\s*[=:]|-----BEGIN)/i.test(v);
const kinds=['PLATFORM_RULE','COMPETITOR','DEMAND_SIGNAL'];
const recordKeys=['productId','kind','entityId','sourceUrl','observedOn','summary'];
export function researchDigest(r){
  if(!exact(r,recordKeys)||!id(r.productId)||!id(r.entityId)||!kinds.includes(r.kind)||!url(r.sourceUrl)||!date(r.observedOn)||!short(r.summary,400))throw Error('RESEARCH_RECORD_INVALID');
  return hash(Object.fromEntries(recordKeys.map(k=>[k,r[k]])));
}
// The grants argument is a separate trusted operator input, not a field of imported research.
// Review is not provider authentication, a redistribution license, or authority to publish.
export function buildResearchRound(plan,{asOf,records,reviewGrants}){
  if(plan?.contractVersion!=='CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1'||plan.publicPublishAllowed!==false||plan.liveSalesAllowed!==false||plan.campaignSpend!==0||plan.providerCalls!==0||!sha.test(plan.sourceSha256??'')||!Array.isArray(plan.products)||plan.products.length>133||!date(asOf)||!Array.isArray(records)||records.length>512||!Array.isArray(reviewGrants)||reviewGrants.length>512)throw Error('RESEARCH_INPUT_INVALID');
  const products=new Map();
  for(const p of plan.products){if(!id(p.id)||products.has(p.id))throw Error('PRODUCT_ID_INVALID');products.set(p.id,p);}
  const grants=new Map();
  for(const g of reviewGrants){if(!exact(g,['digest','reviewRef'])||!sha.test(g.digest)||!short(g.reviewRef,160)||grants.has(g.digest))throw Error('RESEARCH_GRANT_INVALID');grants.set(g.digest,g.reviewRef);}
  const accepted=[],rejected=[];const seen=new Set();
  for(const r of records){const digest=researchDigest(r);if(seen.has(digest))throw Error('RESEARCH_DUPLICATE');seen.add(digest);
    const age=(Date.parse(asOf)-Date.parse(r.observedOn))/86400000;
    if(!products.has(r.productId)||!grants.has(digest)||age<0||age>30){rejected.push({digest,reason:!products.has(r.productId)?'UNKNOWN_PRODUCT':!grants.has(digest)?'UNREVIEWED':'STALE_OR_FUTURE'});continue;}
    accepted.push({...r,digest,reviewRef:grants.get(digest),status:'OPERATOR_REVIEWED_NOT_PROVIDER_AUTHENTICATED'});
  }
  return {contractVersion:'CAPITAL_AI_PRODUCT_MARKET_RESEARCH@1',sourceSha256:plan.sourceSha256,asOf,publicationState:'DRAFT_ONLY',publicPublishAllowed:false,liveSalesAllowed:false,providerCalls:0,campaignSpend:0,accepted,rejected,products:[...products.values()].map(p=>({productId:p.id,queries:[...(Array.isArray(p.discoveryQueries)?p.discoveryQueries.filter(q=>short(q,200)).slice(0,5):[]),`${p.id} official marketplace listing requirements`,`${p.id} competitors pricing alternative`,`${p.id} user problems developer community`],observations:accepted.filter(r=>r.productId===p.id).map(r=>r.digest),status:accepted.some(r=>r.productId===p.id)?'REVIEWED_RESEARCH_CANDIDATE':'RESEARCH_REQUIRED',metrics:{reach:null,visits:null,conversions:null,revenue:null}}))};
}
const pilotChannels={website:'WEBSITE',youtube:'YOUTUBE',redditShowcase:'REDDIT',x:'X',linkedin:'LINKEDIN'};
export function buildSmartcopyPilot(plan,input,{planContentCampaign,buildDraftContentSocialPackage}){
  const round=buildResearchRound(plan,input);
  const p=plan.products.find(p=>p.id==='ai-smartcopy');
  if(!p||round?.contractVersion!=='CAPITAL_AI_PRODUCT_MARKET_RESEARCH@1'||round.sourceSha256!==plan.sourceSha256||round.publicPublishAllowed!==false||round.liveSalesAllowed!==false||!Array.isArray(round.accepted)||typeof planContentCampaign!=='function'||typeof buildDraftContentSocialPackage!=='function')throw Error('PILOT_INPUT_INVALID');
  const evidence=round.accepted.filter(r=>r.productId==='ai-smartcopy');
  if(!evidence.some(r=>r.kind==='PLATFORM_RULE'&&r.entityId==='acode')||!evidence.some(r=>r.kind==='COMPETITOR'))throw Error('PILOT_RESEARCH_MISSING');
  const drafts=[];
  for(const c of p.channels){if(!Object.hasOwn(pilotChannels,c.id))continue;
    const evidenceSha=hash(evidence.map(r=>r.digest).sort());
    const contentId='smartcopy-'+hash([plan.sourceSha256,round.asOf,evidenceSha,c.id]).slice(0,24);
    const formats={website:{format:'SEO landing page',steps:['Problem und AcodeX-Kompatibilität erklären','Synthetisches Beispiel und Installationsgrenzen','Nur freiwillige Pilot-Rückmeldung, kein Checkout']},youtube:{format:'Tutorial und Short',steps:['Synthetischen Befehl starten','Ausgabe und Exit-Code zeigen','Nativen Readback prüfen; unterstützte Geräte offenlegen']},redditShowcase:{format:'Community-Demo',steps:['Subreddit-Regeln aktuell prüfen','Herstellerrolle offenlegen','Konkretes Feedback erfragen; keine Massenposts']},x:{format:'Technischer Kurzpost',steps:['Eigene Demo zeigen','Private Release-Grenzen nennen','Kein automatischer Versand']},linkedin:{format:'IT-Workflow-Fallbeispiel',steps:['Ausgangsproblem erklären','Synthetischen Ablauf zeigen','Keine unbelegten Einsparungsclaims']}};
    const draft={headline:'AI-Smartcopy – Terminalausgaben gezielt kopieren',...formats[c.id],message:'Ein nichtinteraktiver acopy-Befehl, synthetische Ausgabe und nativer Readback. Gerätekompatibilität und private Release-Grenzen offenlegen.',releaseState:'PRIVATE_RC_NOT_FOR_SALE',sourceReview:'REVIEW_REQUIRED',mediaRights:'NOT_PROVEN',noExternalMobileCheckout:true};
    const campaign={campaignId:contentId,productId:p.id,sourceSha:plan.sourceSha256,canonicalUrl:'https://capital-ai.online/',locale:'de-DE',objective:'Nutzungstest vorbereiten; keine Kaufaufforderung',audience:['Mobile Acode-Entwickler'],channels:[pilotChannels[c.id]],outputs:['TEXT'],sourceUrls:[...new Set(evidence.map(r=>r.sourceUrl))].slice(0,12)};
    const contentPlan=planContentCampaign(campaign);
    const socialPackage=buildDraftContentSocialPackage({campaign,contentId,assets:[{assetId:contentId+'-text',contentId,kind:'TEXT',sha256:hash(draft),mimeType:'application/json',evidenceRef:'product-market-research:'+evidenceSha,sourceSha:campaign.sourceSha}]});
    if(contentPlan?.publication?.publicPublishAllowed!==false||socialPackage?.approvals?.length!==0||socialPackage?.deliveries?.length!==0)throw Error('PILOT_AUTHORITY_DENIED');
    drafts.push({channel:c.id,contentId,draft,contentPlan,socialPackage});
  }
  return {contractVersion:'CAPITAL_AI_SMARTCOPY_PILOT_DRAFT@1',publicationState:'DRAFT_ONLY',publicPublishAllowed:false,liveSalesAllowed:false,providerCalls:0,campaignSpend:0,drafts,manualChannelPreparation:p.channels.filter(c=>!Object.hasOwn(pilotChannels,c.id)).map(c=>({id:c.id,rule:c.rule})),conversionPlan:{status:'NOT_PROVEN_NO_PRODUCT_SCOPED_READBACK',existingXContractReuse:'BLOCKED_FIXED_CAMPAIGN_IDENTITY',events:['PRODUCT_VIEWED','INSTALLATION_VERIFIED','CLIPBOARD_READBACK_VERIFIED','CHECKOUT_STARTED','LICENSE_GRANTED','REFUNDED'],metrics:{visits:null,verifiedInstalls:null,paidLicenses:null,refunds:null,revenueCents:null},consentRequiredForOptionalAnalytics:true,clipboardPayloadCollection:false,automaticPromotion:false}};
}

// Offline candidate reconciliation. The scope must be provided independently by the
// operator/server, not derived from client receipts. No provider authentication here.
export function reconcileSmartcopyConversionCandidates(raw, scope) {
  const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
  const ts=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
  const fail=()=>{throw Error('SMARTCOPY_CONVERSION_INPUT_REJECTED');};
  const exact=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===k.length&&k.every(x=>Object.hasOwn(v,x));
  if(!exact(scope,['campaignId','releaseSha256'])||typeof scope.campaignId!=='string'||!/^smartcopy-[a-f0-9]{24}$/.test(scope.campaignId)||!digest(scope.releaseSha256)||!exact(raw,['asOf','start','end','consents','payments'])||![raw.asOf,raw.start,raw.end].every(ts)||!Array.isArray(raw.consents)||!Array.isArray(raw.payments)||raw.consents.length>1000||raw.payments.length>1000)fail();
  const now=Date.parse(raw.asOf),start=Date.parse(raw.start),end=Date.parse(raw.end),day=86400000;
  if(!(start<end&&end<=now&&end-start<=30*day))fail();
  const matching=r=>r.productId==='ai-smartcopy'&&r.campaignId===scope.campaignId&&r.releaseSha256===scope.releaseSha256&&digest(r.subjectKey)&&digest(r.receiptSha256);
  const consents=new Map(),receipts=new Set(),charges=new Set(),subjects=new Set();
  const unique=(set,v)=>{if(set.has(v))fail();set.add(v);};
  for(const r of raw.consents){
    if(!exact(r,['productId','campaignId','releaseSha256','subjectKey','receiptSha256','source','purpose','grantedAt','expiresAt','revokedAt'])||!matching(r)||r.source!=='SERVER_CONSENT_LEDGER'||r.purpose!=='PRODUCT_CONVERSION'||![r.grantedAt,r.expiresAt].every(ts)||!(r.revokedAt===null||ts(r.revokedAt))||Date.parse(r.grantedAt)>now||Date.parse(r.expiresAt)<=Date.parse(r.grantedAt)||Date.parse(r.expiresAt)-Date.parse(r.grantedAt)>180*day||(r.revokedAt!==null&&(Date.parse(r.revokedAt)<Date.parse(r.grantedAt)||Date.parse(r.revokedAt)>now))||consents.has(r.subjectKey))fail();
    unique(receipts,r.receiptSha256);consents.set(r.subjectKey,r);
  }
  let eligible=0,active=0,refunded=0,partial=0,disputed=0,net=0;
  for(const r of raw.payments){
    if(!exact(r,['productId','campaignId','releaseSha256','subjectKey','receiptSha256','source','consentSha256','chargeKey','billing','live','currency','paidAt','observedAt','paidCents','refundedCents','disputed','licenseState'])||!matching(r)||r.source!=='STRIPE_ONE_TIME_RECEIPT'||r.billing!=='one_time'||r.live!==true||r.currency!=='EUR'||!digest(r.consentSha256)||!digest(r.chargeKey)||![r.paidAt,r.observedAt].every(ts)||!Number.isSafeInteger(r.paidCents)||r.paidCents<1||r.paidCents>100000000||!Number.isSafeInteger(r.refundedCents)||r.refundedCents<0||r.refundedCents>r.paidCents||typeof r.disputed!=='boolean'||!['GRANTED','REVOKED'].includes(r.licenseState))fail();
    unique(receipts,r.receiptSha256);unique(charges,r.chargeKey);unique(subjects,r.subjectKey);
    const paid=Date.parse(r.paidAt),observed=Date.parse(r.observedAt),c=consents.get(r.subjectKey);
    if(!c||c.receiptSha256!==r.consentSha256||paid<start||paid>=end||observed<paid||observed>now||now-observed>day||Date.parse(c.grantedAt)>paid||Date.parse(c.expiresAt)<=paid)fail();
    const reversed=r.refundedCents===r.paidCents||r.disputed;
    if(reversed&&r.licenseState!=='REVOKED')fail();
    if(c.revokedAt!==null||Date.parse(c.expiresAt)<=now)continue;
    eligible++;
    if(r.refundedCents===r.paidCents)refunded++;
    else if(r.refundedCents>0)partial++;
    if(r.disputed)disputed++;
    if(!reversed&&r.licenseState==='GRANTED')active++;
    if(!r.disputed)net+=r.paidCents-r.refundedCents;
  }
  return {contractVersion:'CAPITAL_AI_SMARTCOPY_CONVERSION_CANDIDATES@1',productId:'ai-smartcopy',campaignId:scope.campaignId,asOf:raw.asOf,status:'SOURCE_RECORDED_NOT_AUTHENTICATED',candidatePayments:eligible||null,candidateActiveLicenses:eligible?active:null,candidateFullRefunds:eligible?refunded:null,candidatePartialRefunds:eligible?partial:null,candidateDisputes:eligible?disputed:null,candidateNetPaidCents:eligible?net:null,verifiedMetrics:{paidLicenses:null,revenueCents:null,refunds:null},providerAuthentication:'NOT_PROVEN',publicPublishAllowed:false,liveSalesAllowed:false,automaticChanges:false,providerCalls:0,campaignSpend:0};
}
