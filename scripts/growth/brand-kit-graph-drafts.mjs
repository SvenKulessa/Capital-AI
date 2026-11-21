/**
 * CAPITAL_AI_BRAND_CONTEXT_DRAFT@1: offline, deterministic, non-authoritative.
 * Reuses Growth Intelligence, seven Universe tokens, first-party branding and
 * canonical Content/Social contracts. No crawler/model/provider is invoked here.
 */
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { buildGrowthIntelligenceDraftBundle } from './growth-intelligence-drafts.mjs';
import { evaluateGrowthLearningCandidates } from '../../src/platform/SocialMediaEngine/Learning/FeedbackLearningLoop.mjs';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';
import { planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { ensureResvgWasmInitialized } from '../../src/platform/SocialMediaEngine/Branding/ResvgWasmRuntime.mjs';

export const CONTRACT = 'CAPITAL_AI_BRAND_CONTEXT_DRAFT@1';
const sha = value => createHash('sha256').update(value).digest('hex');
const FAMILIES = ['cyan','violet','gold','pink','rose','blue','green'];
const PANELS = [
  ['QUELLE','Datenherkunft','Zeitpunkt','Validierung'],
  ['ANNAHMEN','Modelllogik','Parameter','Kontext'],
  ['GRENZEN','Unsicherheit','Risikofilter','Einsatzgrenze'],
];
const TEMPLATES = {
  X: {id:'universe-evidence-3x3',width:1200,height:1200},
  INSTAGRAM: {id:'universe-evidence-3x3-portrait',width:1080,height:1350},
};
const XML = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const validSummary = v => typeof v==='string' && v.length>0 && v.length<=280
  && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v);
const digest = /^[a-f0-9]{64}$/;
const tokenUrl = new URL('../../public/branding/asset-pack/meta/social-render-tokens.json',import.meta.url);
const logoUrl = new URL('../../public/branding/capital-ai-logo.jpg',import.meta.url);
const ASSET_PROFILE = Object.freeze({
  X:{path:'social/x-link-card-1200x675.jpg',sha256:'0238503dd58d879f822edb9ac7c8146336cdaf68de12ddb579e5dd96eb90c56a'},
  INSTAGRAM:{path:'social/instagram-portrait-1080x1350.jpg',sha256:'297761f524292ce90a8704e18e1441c48a1972c8fc8018436d5e0b2f701a4d47'},
});

/** A crawler's self-declared license/status never admits its own content. */
export function assessContext(records=[], trustedRights=[]) {
  if (!Array.isArray(records) || records.length>16 || !Array.isArray(trustedRights)
    || trustedRights.length>16) throw Error('BRAND_CONTEXT_BATCH_INVALID');
  const accepted=[],rejected=[],seen=new Set();
  for(const record of records) {
    const id=record?.id;
    let url;
    try { url=new URL(record?.sourceUrl); } catch { url=null; }
    let reason;
    if(typeof id!=='string'||!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(id)||seen.has(id))
      reason='SOURCE_ID_INVALID';
    else if(!['CRAWLEE','FIRECRAWL','TINYFISH','LANGGRAPH'].includes(record.tool)
      || !url || url.protocol!=='https:' || url.username || url.password || url.port
      || url.hash || !url.hostname.includes('.') || /(^localhost$|\.local$|\.internal$)/.test(url.hostname)
      || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname) || url.hostname.startsWith('[')
      || !validSummary(record.summary) || !digest.test(record.summarySha256??'')
      || sha(record.summary)!==record.summarySha256)
      reason='SOURCE_PROVENANCE_INVALID';
    else if(record.tool==='LANGGRAPH'
      && (typeof record.graphRunId!=='string'||!/^[A-Za-z0-9_-]{4,90}$/.test(record.graphRunId)))
      reason='GRAPH_RUN_REFERENCE_REQUIRED';
    const grants=trustedRights.filter(g=>g?.sourceId===id && g?.sourceUrl===record?.sourceUrl
      && g?.summarySha256===record?.summarySha256
      && g?.commercialParaphraseAllowed===true && g?.reviewed===true
      && typeof g?.evidenceRef==='string' && /^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef));
    if(!reason&&grants.length!==1)reason='COMMERCIAL_SOURCE_RIGHTS_NOT_PROVEN';
    seen.add(id);
    if(reason){rejected.push({id:typeof id==='string'?id:'invalid',reason});continue;}
    accepted.push({id,tool:record.tool,summary:record.summary,summarySha256:record.summarySha256,
      sourceUrl:record.sourceUrl,rightsEvidenceRef:grants[0].evidenceRef,
      editorialReview:'REVIEW_REQUIRED'});
  }
  return {accepted,rejected,providerCalls:0,graphExecution:'NOT_PROVEN',
    automaticFactApproval:false};
}

/** Only hash-pinned local owner branding; other images need independent grants. */
export function readBrandKit(channel='X') {
  if(!Object.hasOwn(ASSET_PROFILE,channel))throw Error('BRAND_PROFILE_CHANNEL_INVALID');
  const tokens=JSON.parse(readFileSync(tokenUrl,'utf8'));
  const logoPath=fileURLToPath(logoUrl);
  const st=lstatSync(logoPath);
  if(st.isSymbolicLink()||!st.isFile())throw Error('BRAND_LOGO_PATH_UNSAFE');
  const bytes=readFileSync(logoPath);
  if(bytes.length<64||bytes.length>3*1024*1024||bytes[0]!==255||bytes[1]!==216
    || bytes[2]!==255||tokens.authority?.logo!=='public/branding/capital-ai-logo.jpg'
    || sha(bytes)!=='6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3'
    || tokens.authority?.logoSha256!=='6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3')
    throw Error('BRAND_LOGO_DIGEST_MISMATCH');
  const colors=FAMILIES.map(k=>tokens.color?.universe?.[k]?.$value);
  if(colors.some(v=>!/^#[0-9a-fA-F]{6}$/.test(v??''))
    || new Set(colors.map(v=>v.toLowerCase())).size!==7
    || tokens.universeDesign?.version!=='CAPITAL_AI_UNIVERSE@1'
    || tokens.universeDesign?.paletteRule!=='ALL_SEVEN_COLORS_PER_VISUAL'
    || tokens.publishReady!==false)throw Error('BRAND_PALETTE_INVALID');
  const manifest=JSON.parse(readFileSync(new URL('../../public/branding/asset-pack/meta/asset-manifest.json',import.meta.url),'utf8'));
  const profile=ASSET_PROFILE[channel];
  const items=manifest.assets?.filter(a=>a.path===profile.path&&a.sha256===profile.sha256);
  if(manifest.publishReady!==false||manifest.source?.sha256!=='6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3'
    ||manifest.derivation?.thirdPartyVisualAssetsAdded!==false||items?.length!==1||items[0].mime!=='image/jpeg'
    ||items[0].category!=='social')throw Error('BRAND_PROFILE_PROVENANCE_INVALID');
  const profileUrl=new URL('../../public/branding/asset-pack/'+profile.path,import.meta.url);
  const profileStat=lstatSync(fileURLToPath(profileUrl));
  if(!profileStat.isFile()||profileStat.isSymbolicLink())throw Error('BRAND_PROFILE_PATH_UNSAFE');
  const profileBytes=readFileSync(profileUrl);
  if(profileBytes.length!==items[0].bytes||sha(profileBytes)!==profile.sha256
    ||profileBytes[0]!==255||profileBytes[1]!==216||profileBytes[2]!==255)
    throw Error('BRAND_PROFILE_SHA_OR_MIME_MISMATCH');
  return {logo:bytes.toString('base64'),logoSha256:sha(bytes),colors,
    profileBase64:profileBytes.toString('base64'),profileSha256:profile.sha256,
    profilePath:'public/branding/asset-pack/'+profile.path,
    background:tokens.color.background.$value,foreground:tokens.color.foreground.$value,
    logoRightsRef:'docs/licenses/Capital-AI-BRANDING.md'};
}

function svgText(v,x,y,size,fill) {
  return '<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+size+
    '" font-weight="600">'+XML(v)+'</text>';
}
function lines(value,limit=28) {
  const result=[''];
  for(const word of String(value).split(/\s+/)) {
    const k=result.length-1;
    if((result[k]+' '+word).trim().length>limit&&result.length<3)result.push(word);
    else result[k]=(result[k]+' '+word).trim();
  }
  return result.map(x=>x.slice(0,44));
}
export function drawBrandedSvg({draft,kit,context,template}) {
  if(!draft||!template||!kit||!['X','INSTAGRAM'].includes(draft.channel)
    || template!==TEMPLATES[draft.channel])throw Error('BRAND_TEMPLATE_INVALID');
  const logo=Buffer.from(kit.logo??'','base64');
  if(logo.length<64||sha(logo)!==kit.logoSha256
    || !Array.isArray(kit.colors)||kit.colors.length!==7
    || kit.colors.some(c=>!/^#[a-fA-F0-9]{6}$/.test(c))
    || new Set(kit.colors).size!==7
    || !/^#[a-fA-F0-9]{6}$/.test(kit.background??'')
    || !/^#[a-fA-F0-9]{6}$/.test(kit.foreground??''))throw Error('BRAND_KIT_NOT_TRUSTED');
  const profile=Buffer.from(kit.profileBase64??'','base64');
  if(profile.length<64||!digest.test(kit.profileSha256??'')||sha(profile)!==kit.profileSha256)
    throw Error('BRAND_PROFILE_NOT_VERIFIED');
  const w=template.width,h=template.height,margin=44,gap=14,card=(w-88-28)/3;
  const headline=draft.draftText.split('\n')[1]||'Methodik statt Versprechen';
  const summary=context.accepted[0]?.summary??draft.contentPlan.campaign.objective;
  const safeSummary=validSummary(summary)?summary:'Quellen, Annahmen und Grenzen überprüfen.';
  const summaryShort=safeSummary.length>85
    ? safeSummary.slice(0,85).replace(/\s+\S*$/,'')+'…' : safeSummary;
  const orbit=kit.colors.map((c,i)=>'<circle cx="'+w*.82+'" cy="'+h*.36+'" r="'+
    (83+i*24)+'" fill="none" stroke="'+c+'" stroke-width="2" opacity=".15"/>').join('');
  const panels=PANELS.map((p,i)=>{
    const x=margin+(card+gap)*i,y=h-500;
    return '<rect x="'+x+'" y="'+y+'" width="'+card+'" height="288" rx="25" fill="#0C1330" stroke="'+
      kit.colors[i]+'" stroke-width="3"/>'+
      svgText(p[0],x+18,y+58,33,kit.colors[i])+
      p.slice(1).map((s,k)=>svgText('• '+s,x+18,y+124+k*47,24,kit.foreground)).join('');
  }).join('');
  const spectrum=kit.colors.map((c,i)=>'<rect x="'+(margin+i*(w-88)/7)+'" y="'+
    (h-116)+'" width="'+((w-88)/7-3)+'" height="9" rx="4" fill="'+c+'"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title description" '+
    'width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" font-family="sans-serif">'+
    '<title id="title">'+XML(headline)+'</title>'+
    '<desc id="description">Quelle: Datenherkunft, Zeitpunkt, Validierung. Annahmen: Modelllogik, Parameter, Kontext. Grenzen: Unsicherheit, Risikofilter, Einsatzgrenze. Entwurf.</desc>'+
    '<rect width="'+w+'" height="'+h+'" fill="'+kit.background+'"/>'+ 
    '<image x="0" y="0" width="'+w+'" height="'+h+'" opacity=".15" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,'+kit.profileBase64+'"/>'+orbit+
    '<image x="44" y="36" width="174" height="99" href="data:image/jpeg;base64,'+kit.logo+'"/>'+
    svgText('GROWTH INTELLIGENCE · DRAFT',240,95,23,kit.colors[2])+
    lines(headline).map((s,i)=>svgText(s,44,220+i*70,55,kit.foreground)).join('')+
    svgText(summaryShort,44,h-578,23,kit.colors[0])+panels+spectrum+
    svgText('CAPITAL-AI · METHODIK STATT VERSPRECHEN',44,h-56,22,kit.colors[2])+
    '</svg>\n';
}

/** Learning proposes candidate variants; no automatic weights, training or updates. */
export function buildBrandedGrowthDraft({channel,records=[],trustedRights=[],feedback=[],
  evaluatedAt='2026-11-21T00:00:00.000Z'}={}) {
  if(!Object.hasOwn(TEMPLATES,channel))throw Error('BRAND_CHANNEL_UNSUPPORTED');
  const bundle=buildGrowthIntelligenceDraftBundle();
  const draft=bundle.drafts.find(d=>d.channel===channel);
  if(!draft)throw Error('BRAND_SOURCE_DRAFT_MISSING');
  const kit=readBrandKit(channel),context=assessContext(records,trustedRights),template=TEMPLATES[channel];
  const learning=evaluateGrowthLearningCandidates(feedback,{evaluatedAt});
  const svg=drawBrandedSvg({draft,kit,context,template}),imageSha=sha(Buffer.from(svg));
  // Source summaries are quoted evidence, not instructions or publication-ready claims.
  const contextLines=context.accepted.slice(0,3).map(entry=>'['+entry.id+'] '+entry.summary);
  const copyDraft=contextLines.length ? draft.draftText+'\n\n'+
    'Quellenkontext (redaktionell zu prüfen):\n'+contextLines.join('\n') : draft.draftText;
  const textAsset=draft.socialPackage.assets.find(a=>a.kind==='TEXT');
  if(!textAsset||draft.socialPackage.assets.length!==1)throw Error('BRAND_SOURCE_TEXT_ASSET_INVALID');
  const approvedContextTextAsset={...textAsset,sha256:sha(Buffer.from(copyDraft,'utf8'))};
  const campaign={...draft.socialPackage.campaign,outputs:['TEXT','IMAGE','ANALYTICS']};
  const assetId=draft.contentId+'-universe-3x3-svg';
  const asset={assetId,contentId:draft.contentId,kind:'IMAGE',mimeType:'image/svg+xml',
    sha256:imageSha,sourceSha:draft.socialPackage.sourceSha,
    evidenceRef:'docs/licenses/Capital-AI-BRANDING.md#first-party-logo',
    originalGraphic:{assetId,contentId:draft.contentId,sha256:imageSha,
      mimeType:'image/svg+xml',sourceSha:draft.socialPackage.sourceSha,
      sourceDigest:draft.socialPackage.sourceSha,
      contentDigest:sha(JSON.stringify({template,contentId:draft.contentId,
        logoSha256:kit.logoSha256,profileSha256:kit.profileSha256,contextDigests:context.accepted.map(c=>c.summarySha256)})),
      origin:'FIRST_PARTY_TEMPLATE',creationMethod:'AI_ASSISTED',
      renderer:{id:'CAPITAL_AI_BRAND_CONTEXT_SVG',version:'1.0.0'},thirdPartyAssets:false}};
  const socialPackage=buildDraftContentSocialPackage({campaign,contentId:draft.contentId,
    assets:[approvedContextTextAsset,asset]});
  const contentPlan=planContentCampaign(campaign,{originalGraphics:[asset.originalGraphic]});
  if(socialPackage.approvals.length||socialPackage.deliveries.length
    ||contentPlan.publication.publicPublishAllowed
    ||contentPlan.graphicLicenses?.some(x=>x.graphicUseAllowed||x.publicationAllowed))
    throw Error('BRAND_PUBLICATION_AUTHORITY_VIOLATION');
  return {contractVersion:CONTRACT,sourceSha256:bundle.sourceSha256,contentId:draft.contentId,channel,
    copyDraft,
    template:{...template,version:'1.0.0',state:'DRAFT_ONLY'},
    image:{svg,sha256:imageSha,logoSha256:kit.logoSha256,profileSha256:kit.profileSha256,
      profilePath:kit.profilePath,
      altText:'Drei Kategorien Quelle, Annahmen, Grenzen mit je drei Unterkategorien.'},
    contentPlan,socialPackage,
    context:{usedIds:context.accepted.map(x=>x.id),
      provenance:context.accepted.map(x=>({sourceId:x.id,sourceUrl:x.sourceUrl,
        summarySha256:x.summarySha256,rightsEvidenceRef:x.rightsEvidenceRef,tool:x.tool})),
      rejected:context.rejected,
      graphExecution:context.graphExecution,editorialReview:'REVIEW_REQUIRED'},
    learning:{proposals:learning.proposals,templateCandidates:learning.proposals.map(p=>({
      templateId:template.id,evidenceIds:p.evidenceIds,state:'CANDIDATE_ONLY'})),
      autoApply:false,modelWeightsChanged:false},
    rights:'REVIEW_REQUIRED',publicationState:'DRAFT_ONLY',publicPublishAllowed:false,
    providerCalls:0,publishCalls:0};
}

export async function renderBrandPng(draft) {
  if(draft?.contractVersion!==CONTRACT||draft?.publicationState!=='DRAFT_ONLY'
    ||draft.publicPublishAllowed!==false
    ||sha(Buffer.from(draft?.image?.svg??''))!==draft.image.sha256)
    throw Error('BRAND_PNG_INPUT_UNVERIFIED');
  const {Resvg}=await import('@resvg/resvg-wasm');
  await ensureResvgWasmInitialized();
  const font=readFileSync(new URL('../../public/fonts/PlusJakartaSans-Regular.ttf',import.meta.url));
  const r=new Resvg(draft.image.svg,{font:{fontBuffers:[font],defaultFontFamily:'Plus Jakarta Sans'}});
  try {const image=r.render();try{
    if(image.width!==draft.template.width||image.height!==draft.template.height)
      throw Error('BRAND_PNG_DIMENSIONS_INVALID');
    const bytes=Buffer.from(image.asPng());
    if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
      throw Error('BRAND_PNG_INVALID');
    return {bytes,sha256:sha(bytes),width:image.width,height:image.height,publishReady:false};
  }finally{image.free();}}finally{r.free();}
}

/** Bind the *rendered PNG bytes* to the canonical social package, never the SVG digest. */
export async function buildBrandedPngDraft(options={}) {
  const draft=buildBrandedGrowthDraft(options);
  const png=await renderBrandPng(draft);
  const original=draft.socialPackage.assets.find(a=>a.kind==='IMAGE');
  const textAsset=draft.socialPackage.assets.find(a=>a.kind==='TEXT');
  if(!original?.originalGraphic||!textAsset||draft.socialPackage.assets.length!==2)
    throw Error('BRAND_RENDER_SOURCE_MANIFEST_INVALID');
  const assetId=draft.contentId+'-universe-3x3-png';
  const pngAsset={
    ...original,assetId,mimeType:'image/png',sha256:png.sha256,
    originalGraphic:{
      ...original.originalGraphic,
      assetId,mimeType:'image/png',sha256:png.sha256,
      contentDigest:sha(JSON.stringify({
        svgSha256:draft.image.sha256,pngSha256:png.sha256,
        templateId:draft.template.id,templateVersion:draft.template.version,
      })),
      renderer:{id:'CAPITAL_AI_BRAND_CONTEXT_RESVG',version:'1.0.0'},
    },
  };
  const campaign=draft.contentPlan.campaign;
  const socialPackage=buildDraftContentSocialPackage({
    campaign,contentId:draft.contentId,assets:[textAsset,pngAsset],
  });
  const contentPlan=planContentCampaign(campaign,{originalGraphics:[pngAsset.originalGraphic]});
  if(socialPackage.approvals.length||socialPackage.deliveries.length
    ||contentPlan.publication.publicPublishAllowed
    ||contentPlan.graphicLicenses?.some(x=>x.graphicUseAllowed||x.publicationAllowed))
    throw Error('BRAND_PNG_PUBLICATION_AUTHORITY_VIOLATION');
  return {...draft,contentPlan,socialPackage,png,
    image:{...draft.image,pngSha256:png.sha256,pngAssetId:assetId},
    rights:'REVIEW_REQUIRED',publicationState:'DRAFT_ONLY',publicPublishAllowed:false};
}


/** Trusted-server-only, offline, source-hash-bound intake and candidate evaluation. */
export const LICENSED_CONTEXT_ROUND_VERSION='CAPITAL_AI_LICENSED_CONTEXT_ROUND@1';
const SOURCE_ID=/^[a-z0-9][a-z0-9_-]{3,79}$/;
const INJECTION=/ignore\s+(?:all\s+|previous\s+)?instructions|system\s+prompt|developer\s+message|publish\s+now|bypass\s+(?:approval|checks)|<[^>]*>|\u202a|\u202b|\u202c|\u202d|\u202e|\u2066|\u2067|\u2068|\u2069/i;
function extractSourceSummary(text){
  if(typeof text!=='string'||text.length<35||text.length>6000
    ||/[\u0000-\u001f\u007f]/u.test(text)||INJECTION.test(text))return null;
  const clean=text.normalize('NFKC').replace(/\s+/g,' ').trim();
  if(clean.length<35||INJECTION.test(clean))return null;
  const excerpt=clean.slice(0,220).replace(/\s+\S*$/u,'').trim();
  return excerpt.length>=35&&excerpt.length<=220?excerpt:null;
}
/**
 * trustedScope MUST originate from authenticated server authority, NEVER request
 * data or crawler text. This module exposes NO network endpoint or provider call.
 */
export function buildLicensedContextRound(input,trustedScope){
  if(!input||typeof input!=='object'||Array.isArray(input)
    ||Object.keys(input).some(k=>!['tenantId','channel','records','feedback',
      'evaluatedAt','baseTemplateVersion'].includes(k)))
    throw Error('LICENSED_INPUT_INVALID');
  const {tenantId,channel,records=[],feedback=[],evaluatedAt,baseTemplateVersion='1.0.0'}=input;
  if(typeof tenantId!=='string'||!SOURCE_ID.test(tenantId)
    ||trustedScope?.kind!=='SERVER_VERIFIED_TENANT_SCOPE'
    ||trustedScope.authenticated!==true||trustedScope.tenantId!==tenantId)
    throw Error('LICENSED_TENANT_AUTH_REQUIRED');
  if(!['X','INSTAGRAM'].includes(channel)||baseTemplateVersion!=='1.0.0'
    ||typeof evaluatedAt!=='string'||!Number.isFinite(Date.parse(evaluatedAt))
    ||!Array.isArray(records)||records.length>3||!Array.isArray(feedback)
    ||feedback.length>80||!Array.isArray(trustedScope.rightsLedger)
    ||trustedScope.rightsLedger.length>16||!Array.isArray(trustedScope.consentLedger??[])
    ||(trustedScope.consentLedger??[]).length>80)
    throw Error('LICENSED_BATCH_INVALID');
  if(feedback.some(x=>x?.tenantId!==tenantId))
    throw Error('LICENSED_FEEDBACK_TENANT_MISMATCH');
  const accepted=[],grants=[],rejected=[],seen=new Set();
  for(const row of records){
    const id=row?.id;
    if(typeof id!=='string'||!SOURCE_ID.test(id)||seen.has(id)
      ||row.tenantId!==tenantId){
      rejected.push({id:'invalid',reason:'LICENSED_SOURCE_TENANT_OR_ID_INVALID'});continue;
    }
    seen.add(id);
    const exactSha=sha(Buffer.from(typeof row.sourceText==='string'?row.sourceText:''));
    if(!digest.test(row.sourceSha256??'')||row.sourceSha256!==exactSha){
      rejected.push({id,reason:'LICENSED_SOURCE_SHA_MISMATCH'});continue;
    }
    const summary=extractSourceSummary(row.sourceText);
    if(!summary){rejected.push({id,reason:'LICENSED_SOURCE_TEXT_UNSAFE'});continue;}
    const matches=trustedScope.rightsLedger.filter(g=>g?.tenantId===tenantId
      &&g.sourceId===id&&g.sourceUrl===row.sourceUrl
      &&g.sourceSha256===exactSha&&g.commercialParaphraseAllowed===true
      &&g.reviewed===true&&typeof g.evidenceRef==='string'
      &&/^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef));
    if(matches.length!==1){
      rejected.push({id,reason:'COMMERCIAL_SOURCE_RIGHTS_NOT_PROVEN'});continue;
    }
    const record={id,tool:row.tool,sourceUrl:row.sourceUrl,summary,
      summarySha256:sha(summary),...(row.tool==='LANGGRAPH'?{graphRunId:row.graphRunId}:{})};
    const grant={sourceId:id,sourceUrl:row.sourceUrl,summarySha256:sha(summary),
      commercialParaphraseAllowed:true,reviewed:true,evidenceRef:matches[0].evidenceRef};
    const verify=assessContext([record],[grant]);
    if(verify.accepted.length!==1){
      rejected.push({id,reason:verify.rejected[0]?.reason??'LICENSED_SOURCE_INVALID'});continue;
    }
    accepted.push(record);grants.push(grant);
  }
  const allowedFeedback=feedback.filter(f=>{
    if(f?.kind!=='user_feedback'||f?.anonymized!==true||f?.consent!==true)return false;
    // Only a separately trusted, tenant-bound consent/anonymization receipt admits feedback.
    const receipts=(trustedScope.consentLedger??[]).filter(x=>
      x?.tenantId===tenantId&&x.eventId===f.eventId
      &&x.eventSha256===sha(JSON.stringify(f))
      &&x.consentGranted===true&&x.anonymizationVerified===true
      &&typeof x.evidenceRef==='string'&&/^[A-Za-z0-9_.:/#-]{6,220}$/.test(x.evidenceRef));
    return receipts.length===1;
  });
  const draft=buildBrandedGrowthDraft({channel,records:accepted,
    trustedRights:grants,feedback:allowedFeedback,evaluatedAt});
  const image=draft.socialPackage.assets.find(x=>x.kind==='IMAGE');
  if(draft.context.usedIds.length!==accepted.length||!image
    ||image.sha256!==draft.image.sha256||draft.socialPackage.approvals.length
    ||draft.socialPackage.deliveries.length||draft.publicPublishAllowed)
    throw Error('LICENSED_BRAND_IDENTITY_OR_AUTHORITY_INVALID');
  const roundSha256=sha(JSON.stringify({tenantId,channel,baseTemplateVersion,
    ids:accepted.map(x=>x.id),digests:accepted.map(x=>x.summarySha256),
    feedbackEvidence:draft.learning.templateCandidates.map(x=>x.evidenceIds),
    imageSha256:image.sha256}));
  return {
    contractVersion:LICENSED_CONTEXT_ROUND_VERSION,tenantId,channel,roundSha256,
    sourceIntake:{accepted:accepted.map(x=>({
      id:x.id,sourceUrl:x.sourceUrl,tool:x.tool,summarySha256:x.summarySha256,
      sourceSha256:records.find(row=>row.id===x.id).sourceSha256,
      rightsEvidenceRef:grants.find(g=>g.sourceId===x.id).evidenceRef,
      editorialReview:'REVIEW_REQUIRED'})),rejected},
    draft,templateEvaluation:{
      baseVersion:baseTemplateVersion,roundSha256,
      candidates:draft.learning.templateCandidates.map(c=>({
        ...c,proposedVersion:'1.0.1-candidate.'+roundSha256.slice(0,12)})),
      rejectedConsentCount:feedback.length-allowedFeedback.length,
      consentRequired:true,autoPromote:false,weightsChanged:false},
    graphExecution:'NOT_PROVEN',ragExecution:'NOT_PROVEN',
    providerCalls:0,publishCalls:0,publicationState:'DRAFT_ONLY',
    publicPublishAllowed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const channel=process.argv[2],output=process.argv[3];
  if(!output) {
    const draft=buildBrandedGrowthDraft({channel});
    process.stdout.write(JSON.stringify({contractVersion:draft.contractVersion,
      channel,contentId:draft.contentId,svgSha256:draft.image.sha256,
      publicationState:draft.publicationState,rights:draft.rights},null,2)+'\n');
  } else {
    const draft=await buildBrandedPngDraft({channel});
    const directory=resolve(output),name=channel.toLowerCase()+'-'+draft.contentId.toLowerCase();
    mkdirSync(directory,{recursive:true,mode:0o700});
    writeFileSync(join(directory,name+'.svg'),draft.image.svg,{flag:'wx'});
    writeFileSync(join(directory,name+'.png'),draft.png.bytes,{flag:'wx'});
    writeFileSync(join(directory,name+'.json'),JSON.stringify({contentId:draft.contentId,channel,
      svgSha256:draft.image.sha256,pngSha256:draft.png.sha256,
      socialPackage:draft.socialPackage,contentPlan:draft.contentPlan,
      rights:draft.rights,publicationState:'DRAFT_ONLY',publicPublishAllowed:false},null,2)+'\n',{flag:'wx'});
    process.stdout.write('DRAFT_EXPORTED='+name+'\nPUBLISH=DISABLED\n');
  }
}