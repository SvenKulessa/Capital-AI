import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildGrowthIntelligenceContentDrafts } from '../../src/contracts/growthIntelligenceContent.ts';

export const GROWTH_INTELLIGENCE_PLAN_PATH =
  'CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json';
const sourceUrl = new URL('../../' + GROWTH_INTELLIGENCE_PLAN_PATH, import.meta.url);

/**
 * Deterministic, provider-free Content/Social package handoff.
 * Build-time draft projection only: no scheduler, provider request or publication.
 */

export const GROWTH_DATA_LAYER_VERSION = 'CAPITAL_AI_GROWTH_DATA_LAYER@1';
const SOURCE_METRICS = Object.freeze({
  GA4: ['sessions', 'engagedSessions'],
  GSC: ['clicks', 'impressions', 'ctr', 'position'],
  INSTAGRAM: ['reach', 'accounts_engaged'],
  YOUTUBE: ['views', 'estimatedMinutesWatched'],
});
const SOURCE_IDS = Object.keys(SOURCE_METRICS);
const identityPatterns = {
  GA4: /^properties\/[1-9][0-9]{0,19}$/,
  GSC: /^sc-domain:capital-ai\.online$/,
  INSTAGRAM: /^[0-9]{1,32}$/,
  YOUTUBE: /^UC[A-Za-z0-9_-]{22}$/,
};
const exact = (o, keys) => !!o && typeof o === 'object' && !Array.isArray(o)
  && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v))
  && new Date(v).toISOString() === v;
const count = v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const failure = (source, status) => ({ source, status, metrics: null, evidenceSha256: null });
function metricProjection(source, payload) {
  const keys = SOURCE_METRICS[source];
  if (source === 'GA4') {
    if (!exact(payload, keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload[k]]));
  }
  if (source === 'GSC') {
    if (!exact(payload, ['rows']) || !Array.isArray(payload.rows) || payload.rows.length !== 1
      || !exact(payload.rows[0],keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload.rows[0][k]]));
  }
  if (source === 'INSTAGRAM') {
    // Explicit, period-level aggregate projection from the approved read adapter.
    // Never add unique-account reach or engagement across daily rows.
    if (!exact(payload, keys)) return null;
    return Object.fromEntries(keys.map(k => [k,payload[k]]));
  }
  if (source === 'YOUTUBE') {
    if (!exact(payload,['columnHeaders','rows']) || !Array.isArray(payload.columnHeaders)
      || payload.columnHeaders.length !== keys.length
      || !payload.columnHeaders.every((h,i) => h?.name === keys[i])
      || !Array.isArray(payload.rows) || payload.rows.length !== 1
      || !Array.isArray(payload.rows[0]) || payload.rows[0].length !== keys.length) return null;
    return Object.fromEntries(keys.map((k,i) => [k,payload.rows[0][i]]));
  }
  return null;
}

/** Operator-bound data projection, not provider authentication or consent authority.
 * Each source is independent. Imported data can never self-attest or become an
 * attribution event; property-level aggregates have no campaign/content identity.
 * A trusted caller supplies expected account identities out of band.
 */
export function projectGrowthDataLayer({ records, expectedIdentities, asOf } = {}) {
  if (!Array.isArray(records) || records.length > 4 || !iso(asOf)
    || !expectedIdentities || typeof expectedIdentities !== 'object'
    || Array.isArray(expectedIdentities)
    || Object.keys(expectedIdentities).some(k => !SOURCE_IDS.includes(k))
    || records.some(r => !SOURCE_IDS.includes(r?.source))) throw Error('GROWTH_DATA_INPUT_INVALID');
  const sources = SOURCE_IDS.map(source => {
    const matches = records.filter(r => r.source === source);
    if (matches.length > 1) return failure(source,'BLOCKED_DUPLICATE_SOURCE');
    if (!matches.length) return failure(source,'NOT_PROVEN_NO_READBACK');
    const record = matches[0];
    const expected = expectedIdentities[source];
    if (typeof expected !== 'string' || !identityPatterns[source].test(expected))
      return failure(source,'BLOCKED_IDENTITY_NOT_CONFIGURED');
    if (!exact(record,['source','identity','startDate','endDate','observedAt','payload'])
      || record.identity !== expected) return failure(source,'BLOCKED_IDENTITY_OR_ENVELOPE');
    const { startDate, endDate, observedAt } = record;
    if (!date(startDate) || !date(endDate) || startDate > endDate || !iso(observedAt)
      || Date.parse(endDate) - Date.parse(startDate) > 30 * 86400000
      || observedAt > asOf || endDate >= observedAt.slice(0,10))
      return failure(source,'BLOCKED_INVALID_PERIOD');
    if (Date.parse(asOf) - Date.parse(observedAt) > 86400000
      || Date.parse(asOf.slice(0,10)) - Date.parse(endDate) > 7 * 86400000)
      return failure(source,'NOT_PROVEN_STALE');
    const metrics = metricProjection(source,record.payload);
    if (!metrics) return failure(source,'NOT_PROVEN_INVALID_OR_EMPTY_REPORT');
    const valid = Object.entries(metrics).every(([k,v]) =>
      k === 'ctr' ? typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
      : k === 'position' ? typeof v === 'number' && Number.isFinite(v) && v >= 0
      : count(v));
    if (!valid || (source === 'GA4' && metrics.engagedSessions > metrics.sessions)
      || (source === 'GSC' && metrics.clicks > metrics.impressions))
      return failure(source,'NOT_PROVEN_INVALID_METRICS');
    const projection = { source, identity: expected, startDate, endDate, observedAt, metrics };
    return { ...projection, status:'SOURCE_RECORDED_NOT_AUTHENTICATED',
      evidenceSha256:sha(projection) };
  });
  return { contractVersion:GROWTH_DATA_LAYER_VERSION, asOf, sources,
    attributionEvents: [], graphExecution:'NOT_PROVEN', providerCalls:0,
    publicPublishAllowed:false, automaticRecommendationPromotion:false };
}


/** Explicitly enabled operator read plane. No token is accepted from imported records,
 * no arbitrary endpoint/redirect, no retry, no raw response or error escapes.
 * Dates are fixed completed UTC calendar dates; Google reports use their own
 * provider calendar. Require every requested Google report day before aggregation.
 */
const dayMs = 86400000;
const addDays = (d,n) => new Date(Date.parse(d)+n*dayMs).toISOString().slice(0,10);
const readError = code => new Error(code);
const safeReadCodes = new Set(['AUTH_REQUIRED','RATE_LIMITED','PROVIDER_UNAVAILABLE',
  'INVALID_RESPONSE','IDENTITY_MISMATCH','INCOMPLETE_PERIOD','DISABLED']);
const tokenOk = v => typeof v==='string' && v.length>=8 && v.length<=8192 && !/[\s\x00-\x1f\x7f]/.test(v);
async function providerJson(url, token, fetchImpl, body) {
  if(!tokenOk(token)) throw readError('AUTH_REQUIRED');
  let response;
  try {
    response=await fetchImpl(url,{
      method:body===undefined?'GET':'POST',redirect:'error',
      headers:{Authorization:'Bearer '+token,Accept:'application/json',
        ...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)
    });
    if(response.status===401||response.status===403)throw readError('AUTH_REQUIRED');
    if(response.status===429)throw readError('RATE_LIMITED');
    if(!response.ok)throw readError('PROVIDER_UNAVAILABLE');
    // Bound before concatenation; never forward provider error text.
    const reader=response.body?.getReader();
    if(!reader)throw readError('INVALID_RESPONSE');
    let length=0;const chunks=[];
    try{
      for(;;){const {done,value}=await reader.read();if(done)break;
        length+=value.byteLength;if(length>65536){await reader.cancel();throw readError('INVALID_RESPONSE');}
        chunks.push(Buffer.from(value));}
    }finally{reader.releaseLock();}
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!value||typeof value!=='object'||Array.isArray(value)||value.error||value.errors)
      throw readError('INVALID_RESPONSE');
    return value;
  }catch(e){throw readError(safeReadCodes.has(e?.message)?e.message:'PROVIDER_UNAVAILABLE');}
}
function requireReadPeriod(start,end) {
  if(!date(start)||!date(end)||start>end||Date.parse(end)-Date.parse(start)>30*dayMs)
    throw readError('INVALID_RESPONSE');
}
function daysComplete(rows,start,end,getDay) {
  requireReadPeriod(start,end);
  const expected=new Set();
  for(let d=start;d<=end;d=addDays(d,1))expected.add(d);
  if(!Array.isArray(rows)||rows.length!==expected.size)throw readError('INCOMPLETE_PERIOD');
  for(const row of rows)if(!expected.delete(getDay(row)))throw readError('INCOMPLETE_PERIOD');
}
function safeAggregate(values) {
  if(!values.every(count))throw readError('INVALID_RESPONSE');
  const total=values.reduce((a,b)=>a+b,0);
  if(!count(total))throw readError('INVALID_RESPONSE');
  return total;
}
export function createGrowthProviderReaders({fetchImpl=fetch}={}) {
  const get=(url,token,body)=>providerJson(url,token,fetchImpl,body);
  return Object.freeze({
    async GSC({identity,token,startDate,endDate}) {
      requireReadPeriod(startDate,endDate);
      if(identity!=='sc-domain:capital-ai.online')throw readError('IDENTITY_MISMATCH');
      const base='https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(identity);
      const site=await get(base,token);
      if(site.siteUrl!==identity||!['siteOwner','siteFullUser','siteRestrictedUser'].includes(site.permissionLevel))
        throw readError('IDENTITY_MISMATCH');
      const report=await get(base+'/searchAnalytics/query',token,{
        startDate,endDate,dimensions:['date'],rowLimit:31,dataState:'final',aggregationType:'byProperty'
      });
      const rows=report.rows;
      daysComplete(rows,startDate,endDate,r=>Array.isArray(r?.keys)&&r.keys.length===1?r.keys[0]:null);
      if(rows.some(r=>!count(r.clicks)||!count(r.impressions)||r.clicks>r.impressions
        ||typeof r.position!=='number'||!Number.isFinite(r.position)||r.position<0))
        throw readError('INVALID_RESPONSE');
      const clicks=safeAggregate(rows.map(r=>r.clicks)),impressions=safeAggregate(rows.map(r=>r.impressions));
      // Zero impressions cannot establish average position; do not invent it.
      if(!impressions)throw readError('INCOMPLETE_PERIOD');
      const position=rows.reduce((a,r)=>a+r.position*r.impressions,0)/impressions;
      if(!Number.isFinite(position))throw readError('INVALID_RESPONSE');
      return {rows:[{clicks,impressions,ctr:clicks/impressions,position}]};
    },
    async INSTAGRAM({identity,token,startDate,endDate,version}) {
      requireReadPeriod(startDate,endDate);
      if((typeof identity!=='string'||!identityPatterns.INSTAGRAM.test(identity))||!/^v[1-9][0-9]\.0$/.test(version??''))
        throw readError('IDENTITY_MISMATCH');
      const base='https://graph.facebook.com/'+version+'/'+identity;
      const account=await get(base+'?fields=id',token);
      if(account.id!==identity)throw readError('IDENTITY_MISMATCH');
      const url=new URL(base+'/insights');
      url.search=new URLSearchParams({metric:'reach,accounts_engaged',period:'day',metric_type:'total_value',
        since:String(Date.parse(startDate)/1000),until:String(Date.parse(addDays(endDate,1))/1000)}).toString();
      const report=await get(url.toString(),token);
      if(!Array.isArray(report.data)||report.data.length!==2||report.paging?.next)
        throw readError('INCOMPLETE_PERIOD');
      const entries=SOURCE_METRICS.INSTAGRAM.map(name=>{
        const matches=report.data.filter(r=>r?.name===name);
        if(matches.length!==1||matches[0].period!=='day'||!count(matches[0].total_value?.value))
          throw readError('INVALID_RESPONSE');
        return [name,matches[0].total_value.value];
      });
      return Object.fromEntries(entries);
    },
    async YOUTUBE({identity,token,startDate,endDate}) {
      requireReadPeriod(startDate,endDate);
      if((typeof identity!=='string'||!identityPatterns.YOUTUBE.test(identity)))throw readError('IDENTITY_MISMATCH');
      // Exact channel ID is authorized by Analytics itself (no broader Data API scope).
      const url=new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      url.search=new URLSearchParams({ids:'channel=='+identity,startDate,endDate,
        dimensions:'day',metrics:'views,estimatedMinutesWatched',sort:'day',maxResults:'31'}).toString();
      const report=await get(url.toString(),token);
      if(!Array.isArray(report.columnHeaders)||report.columnHeaders.length!==3
        ||!['day','views','estimatedMinutesWatched'].every((name,i)=>report.columnHeaders[i]?.name===name))
        throw readError('INVALID_RESPONSE');
      daysComplete(report.rows,startDate,endDate,r=>Array.isArray(r)&&r.length===3?r[0]:null);
      return {columnHeaders:[{name:'views'},{name:'estimatedMinutesWatched'}],
        rows:[[safeAggregate(report.rows.map(r=>r[1])),safeAggregate(report.rows.map(r=>r[2]))]]};
    },
  });
}

/** Trusted operator invocation, never called by default draft builds. All
 * failures isolated; provider tokens and raw errors never enter output.
 * Default lag of four completed days avoids claiming fresh incomplete Google data.
 */
async function existingGa4Reader({env,now}) {
  const {createGoogleAnalyticsMcpClient}=await import('../../server/google-analytics-mcp.mjs');
  const {buildGrowthGa4Readback}=await import('../../server/google-analytics-readback.mjs');
  const client=createGoogleAnalyticsMcpClient({env});
  try{
    return await buildGrowthGa4Readback({client,propertyNumber:env.GOOGLE_ANALYTICS_PROPERTY_NUMBER,now});
  }finally{client.close();}
}
function propertyLocalDate(isoTime,timeZone){
  if(typeof timeZone!=='string'||!timeZone)throw readError('INVALID_RESPONSE');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(isoTime));
  const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const result=values.year+'-'+values.month+'-'+values.day;
  if(!date(result))throw readError('INVALID_RESPONSE');
  return result;
}
export async function collectGrowthProviderData({env=process.env,fetchImpl=fetch,now=Date.now,readGa4=existingGa4Reader,includeDraftBundle=true}={}) {
  const asOf=new Date(now()).toISOString();
  const endDate=addDays(asOf.slice(0,10),-4),startDate=addDays(endDate,-6);
  const expectedIdentities={GSC:'sc-domain:capital-ai.online'};
  const config={
    GSC:{identity:expectedIdentities.GSC,token:env.GROWTH_GSC_READ_TOKEN},
    INSTAGRAM:{identity:env.GROWTH_INSTAGRAM_ACCOUNT_ID,token:env.GROWTH_INSTAGRAM_READ_TOKEN,
      version:env.SOCIAL_META_GRAPH_API_VERSION},
    YOUTUBE:{identity:env.GROWTH_YOUTUBE_CHANNEL_ID,token:env.GROWTH_YOUTUBE_READ_TOKEN}
  };
  const readers=createGrowthProviderReaders({fetchImpl});
  const records=[],transport=[];
  const gaId='properties/'+String(env.GOOGLE_ANALYTICS_PROPERTY_NUMBER??'');
  if(identityPatterns.GA4.test(gaId))expectedIdentities.GA4=gaId;
  if(env.GROWTH_GA4_READ_ENABLED!=='true')transport.push({source:'GA4',status:'DISABLED'});
  else if(!expectedIdentities.GA4||!env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON||!env.GOOGLE_ANALYTICS_CLOUD_PROJECT)
    transport.push({source:'GA4',status:'AUTH_REQUIRED'});
  else try{
    const report=await readGa4({env,now:()=>Date.parse(asOf)});
    if(report?.status!=='PROVIDER_READ_VERIFIED'||report?.property?.resourceName!==gaId||report?.source!=='GA4_DATA_API'
      ||report.observedAt!==asOf||report?.period?.start!=='7daysAgo'||report?.period?.end!=='yesterday')
      throw readError('INVALID_RESPONSE');
    const local=propertyLocalDate(asOf,report.period.timeZone);
    records.push({source:'GA4',identity:gaId,startDate:addDays(local,-7),endDate:addDays(local,-1),observedAt:asOf,payload:report.metrics});
    transport.push({source:'GA4',status:'READ_RESPONSE_RECEIVED'});
  }catch(e){transport.push({source:'GA4',status:safeReadCodes.has(e?.message)?e.message:'PROVIDER_UNAVAILABLE'});}
  for(const source of ['GSC','INSTAGRAM','YOUTUBE']){
    const cfg=config[source];
    if(typeof cfg.identity==='string'&&identityPatterns[source].test(cfg.identity))
      expectedIdentities[source]=cfg.identity;
    if(env['GROWTH_'+source+'_READ_ENABLED']!=='true'){
      transport.push({source,status:'DISABLED'});continue;
    }
    if(!tokenOk(cfg.token)){
      transport.push({source,status:'AUTH_REQUIRED'});continue;
    }
    try{
      const payload=await readers[source]({...cfg,startDate,endDate});
      records.push({source,identity:cfg.identity,startDate,endDate,observedAt:asOf,payload});
      transport.push({source,status:'READ_RESPONSE_RECEIVED'});
    }catch(e){transport.push({source,status:safeReadCodes.has(e?.message)?e.message:'PROVIDER_UNAVAILABLE'});}
  }
  return {contractVersion:'CAPITAL_AI_GROWTH_PROVIDER_READ@1',transport,
    growthDataLayer:projectGrowthDataLayer({records,expectedIdentities,asOf}),
    ...(includeDraftBundle ? {draftBundle:buildGrowthIntelligenceDraftBundle({records,expectedIdentities,asOf})} : {}),
    collectionMode:'EXPLICIT_READ_ONLY',publicPublishAllowed:false};
}

export function buildGrowthIntelligenceDraftBundle(dataInput) {
  const sourceBytes = readFileSync(fileURLToPath(sourceUrl));
  const rawPlan = JSON.parse(sourceBytes.toString('utf8'));
  const drafts = buildGrowthIntelligenceContentDrafts(rawPlan);
  return {
    contractVersion: 'CAPITAL_AI_GROWTH_INTELLIGENCE_DRAFT_BUNDLE@1',
    sourcePath: GROWTH_INTELLIGENCE_PLAN_PATH,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    sourceGeneratedDate: rawPlan.generated_date,
    publicationState: 'DRAFT_ONLY',
    publicPublishAllowed: false,
    providerCalls: 0,
    campaignSpend: 0,
    mediaAssetsProduced: 0,
    providerCandidates: [{
      id: 'legal-data-hunter',
      intendedUse: 'CUSTOMER_FACING_LEGAL_SOURCE_RESEARCH',
      commercialState: 'BLOCKED_ORDER_FORM_REQUIRED',
      termsUrl: 'https://legaldatahunter.com/api-mcp-terms',
      termsEffectiveDate: '2026-08-11',
      reviewedAt: '2026-11-21',
      providerEnabled: false,
    }],
    drafts,
    ...(dataInput === undefined ? {} : { growthDataLayer: projectGrowthDataLayer(dataInput) }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args=process.argv.slice(2);
  if(args.length===0) process.stdout.write(JSON.stringify(buildGrowthIntelligenceDraftBundle(), null, 2) + '\n');
  else if(args.length===1 && args[0]==='--read-providers') process.stdout.write(JSON.stringify(await collectGrowthProviderData(),null,2)+'\n');
  else if(args.length===2 && args[0]==='--read-providers' && args[1]==='--graph-handoff')
    process.stdout.write(JSON.stringify(await collectGrowthProviderData({includeDraftBundle:false}))+'\n');
  else throw Error('GROWTH_CLI_ARGUMENT_INVALID');
}
