import { createHash } from 'node:crypto';
import { normalizeSocialTrend, socialTrendRecordSha256, projectSocialTrendCandidates } from './social-trend-projection.mjs';
export const VIRAL_PRODUCT_VERSION = 'CAPITAL_AI_VIRAL_PRODUCT_DRAFT@1';
const BRAND_VERSION='CAPITAL_AI_UNIVERSE@1';
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const slug = v => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v);
const words = v => Array.isArray(v) && v.length > 0 && v.length <= 12 && v.every(slug) && new Set(v).size === v.length;
const text = (v,n) => typeof v === 'string' && v.length > 0 && v.length <= n && v.trim()===v && /[\p{L}\p{N}]/u.test(v) && /^[\p{L}\p{N} .,!?():;–-]+$/u.test(v);
const keysProduct = ['id','sourceSha','name','topic','benefit','walkthrough','url','keywords','audienceId','intent'];
const keysSignal = ['recordSha256','keywords','audience','intent','hookSummary'];
const keysEngagement = ['recordSha256','interactions','metricDefinition'];
const bounded = (v,n) => Array.isArray(v) && v.length <= n;
const allowedUrls = ['https://capital-ai.online/','https://capital-ai.online/learning'];
const intents = ['learn','compare','understand','evaluate'];
const grantKeys = ['sha256','evidenceRef'];
const validGrant = (g) => exact(g,grantKeys) && hex(g.sha256) && typeof g.evidenceRef === 'string' && /^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef);
const validProduct = p => exact(p,keysProduct) && slug(p.id) && typeof p.sourceSha === 'string' && /^[a-f0-9]{40}$/.test(p.sourceSha) && text(p.name,40) && text(p.topic,70) && text(p.benefit,85) && text(p.walkthrough,120) && allowedUrls.includes(p.url) && words(p.keywords) && slug(p.audienceId) && intents.includes(p.intent);
const validSignal = s => exact(s,keysSignal) && hex(s.recordSha256) && words(s.keywords) && slug(s.audience) && intents.includes(s.intent) && text(s.hookSummary,240);
const validEngagement = e => exact(e,keysEngagement) && hex(e.recordSha256) && Number.isSafeInteger(e.interactions) && e.interactions >= 0 && slug(e.metricDefinition);
export const viralRecordDigest = (v,kind) => {
  const spec = { product:[validProduct,keysProduct], signal:[validSignal,keysSignal], engagement:[validEngagement,keysEngagement] };
  if (!Object.hasOwn(spec,kind) || !spec[kind][0](v)) return null;
  return hash(Object.fromEntries(spec[kind][1].map(k=>[k,v[k]])));
};
const grantMap = rows => {
  const counts = new Map();
  for (const g of rows) if (validGrant(g)) counts.set(g.sha256,(counts.get(g.sha256)||0)+1);
  return counts;
};
const selectUnique = (rows,key) => {
  const index = new Map();
  for (const row of rows) if (row && typeof row[key] === 'string') index.set(row[key],index.has(row[key])?null:row);
  return index;
};
const cohortKey = r => JSON.stringify([r.platform,r.metric,r.niche,r.format,r.accountBand,Math.floor((Date.parse(r.observedAt)-Date.parse(r.publishedAt))/86400000),r.observedAt.slice(0,10)]);
function scoreFit(signal, product) {
  const matches = signal.keywords.filter(k => product.keywords.includes(k)).length;
  if (!matches) return 0;
  return Math.round(50 * matches / signal.keywords.length) + (signal.audience === product.audienceId ? 25 : 0) + (signal.intent === product.intent ? 25 : 0);
}
function classifyHook(summary) {
  if (/\b(statt|mythos|irrtum|falsch|nicht wahr)\b/iu.test(summary)) return 'CONTRARIAN_TAKE';
  if (/\b(schritt|anleitung|tutorial|wie du|so geht)\b/iu.test(summary)) return 'TUTORIAL';
  if (/\b(fallstudie|case study|vergleichstest|experiment)\b/iu.test(summary)) return 'CASE_STUDY';
  if (/\b([2-9] tipps|liste|[2-9] fehler|checkliste)\b/iu.test(summary)) return 'LISTICLE';
  if (/\b(reaktion|reaction|kommentar zu)\b/iu.test(summary)) return 'REACTION';
  return 'UNCLASSIFIED';
}
function classifyTrigger(summary) {
  if (/\b(risiko|fehler|verlust|gefahr)\b/iu.test(summary)) return 'ERROR_AVOIDANCE';
  if (/\b(quelle|transparent|nachvollziehbar|beleg)\b/iu.test(summary)) return 'TRANSPARENCY';
  if (/\b(zeit|schneller|aufwand)\b/iu.test(summary)) return 'TIME_SAVING';
  if (/\b(anleitung|grundlagen|lernen|verstehen)\b/iu.test(summary)) return 'KNOWLEDGE_GAP';
  return 'NOT_PROVEN';
}
function xWeight(v) {
  return [...v].reduce((total,char)=>{const n=char.codePointAt(0);return total+(n<=4351||(n>=8192&&n<=8205)||(n>=8208&&n<=8223)||(n>=8242&&n<=8247)?1:2);},0);
}
function createAssets(p, pattern) {
  const hooks = { CONTRARIAN_TAKE: 'Was wird bei diesem Thema oft übersehen?', TUTORIAL: 'So gehst du strukturiert vor.', CASE_STUDY: 'Wie prüfst du ein konkretes Beispiel?', LISTICLE: 'Drei Fragen, die du dir stellen solltest.', REACTION: 'Was steckt hinter der aktuellen Diskussion?' };
  const hook = hooks[pattern];
  const cta = 'Mehr erfahren: ' + p.url;
  const disclaimer = 'Nur Information, keine Anlageberatung.';
  const body = p.name + ': ' + p.benefit;
  return {
    x_post: { hook, body: body + ' ' + disclaimer, cta },
    instagram_carousel: { caption: hook + ' ' + body + ' ' + disclaimer + ' ' + cta, slides: [hook, 'Das Problem: ' + p.topic, 'Welche Daten und Annahmen liegen vor?', body, 'Beispiel: ' + p.walkthrough, cta + ' · ' + disclaimer] },
    short_form_video: { title: p.name + ': ' + p.topic, duration_sec: 60, script_scenes: [
      { timestamp: '0:00-0:03', visual_cue: 'Eigene Titelgrafik, Universe-Design', voiceover: hook, on_screen_text: p.topic },
      { timestamp: '0:03-0:20', visual_cue: 'Eigene animierte Grafik: Quelle, Annahme, Grenze', voiceover: 'Bevor du eine Aussage bewertest, prüfe ihre Quelle, die Annahmen und mögliche Grenzen. Worum geht es? ' + p.topic, on_screen_text: 'Quelle · Annahme · Grenze' },
      { timestamp: '0:20-0:45', visual_cue: 'Nur geprüfte App-Ansicht ohne private Daten aufnehmen: ' + p.walkthrough, voiceover: body + ' Prüfe im Beispiel, welche Informationen tatsächlich vorliegen. Ergebnisse sind keine Garantie für zukünftige Entwicklungen.', on_screen_text: p.name },
      { timestamp: '0:45-1:00', visual_cue: 'Eigene CTA-Endkarte und Untertitel', voiceover: 'Entdecke die Grundlagen auf CAPITAL-AI und bilde dir eine eigene Meinung. ' + disclaimer, on_screen_text: cta + ' · ' + disclaimer },
    ] },
    youtube_long_form: { titles: [p.topic + ': ein nachvollziehbarer Einstieg', p.name + ' im Praxisbeispiel: ' + p.topic], thumbnail_concept: 'Eigene Universe-Grafik mit sieben Farbfamilien, Titel und geprüftem App-Ausschnitt; keine fremden Logos oder Screenshots.', outline: ['00:00 Hook und Fragestellung', '00:30 Problem und typische Missverständnisse', '01:30 Grundlagen und Quellen', '02:30 Geprüfter App-Walkthrough: ' + p.walkthrough, '05:30 Anwendungsbeispiel', '07:00 Grenzen und Risiken', '07:30 CTA: ' + p.url, '08:00 Ende'] }
  };
}

// Trusted grants are separate operator inputs, not accepted from scraped records.
// Content remains DRAFT_ONLY. Source-recorded metrics do not authenticate themselves.
export function createViralProductEngine({ clock=Date.now, persistentCache }={}) {
  if(persistentCache!==undefined&&(typeof persistentCache?.read!=='function'||typeof persistentCache?.write!=='function'))throw Error('VIRAL_CACHE_ADAPTER_INVALID');
  const cache = new Map();
  return function build(records, options={}) {
    const { asOf, trustedAnalyticsGrants=[], editorialSignals=[], trustedEditorialGrants=[], engagementRecords=[], trustedEngagementGrants=[], productContexts=[], trustedProductGrants=[] } = options;
    if (![editorialSignals,trustedEditorialGrants,engagementRecords,trustedEngagementGrants].every(v=>bounded(v,1000)) || ![productContexts,trustedProductGrants].every(v=>bounded(v,50))) throw Error('VIRAL_INPUT_LIMIT');
    const projection = projectSocialTrendCandidates(records,{asOf,trustedAnalyticsGrants});
    const editorial = selectUnique(editorialSignals,'recordSha256'), engagement = selectUnique(engagementRecords,'recordSha256');
    const eGrants = grantMap(trustedEditorialGrants), mGrants = grantMap(trustedEngagementGrants), pGrants = grantMap(trustedProductGrants);
    const productIds = selectUnique(productContexts,'id');
    const products = [...productIds.values()].filter(p=>p && pGrants.get(viralRecordDigest(p,'product'))===1);
    const byIdentity = new Map();
    for (const raw of records) {
      if (raw && typeof raw.platform==='string' && typeof raw.postId==='string') {
        const id=raw.platform+':'+raw.postId;
        byIdentity.set(id,byIdentity.has(id)?null:raw);
      }
    }
    const aGrants = new Map();
    for (const g of trustedAnalyticsGrants) if (g && exact(g,['recordSha256','analyticsAllowed','evidenceRef']) && hex(g.recordSha256) && g.analyticsAllowed===true && typeof g.evidenceRef==='string' && /^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef)) aGrants.set(g.recordSha256,(aGrants.get(g.recordSha256)||0)+1);
    const cohorts=new Map(), byDigest=new Map();
    for (const raw of byIdentity.values()) {
      const r=normalizeSocialTrend(raw,asOf);
      if (!r || r.metric!=='views' || r.views===0) continue;
      const sha=socialTrendRecordSha256(r,asOf), e=engagement.get(sha);
      if (aGrants.get(sha)!==1 || !e || mGrants.get(viralRecordDigest(e,'engagement'))!==1) continue;
      const key=cohortKey(r)+':'+e.metricDefinition, rate=e.interactions/r.views;
      if (!cohorts.has(key)) cohorts.set(key,[]);
      cohorts.get(key).push({sha,rate});
      byDigest.set(sha,{key,rate,engagementSha:viralRecordDigest(e,'engagement')});
    }
    const result={contractVersion:VIRAL_PRODUCT_VERSION,status:'NOT_PROVEN',analyzedTrendsCount:projection.analyzedTrendsCount,selectedOpportunities:[],blocked:{engagement:0,editorial:0,productFit:0},cacheHits:0,diskCacheHits:0,providerCalls:0,additionalCostUsd:0,publicPublishAllowed:false,publicationState:'DRAFT_ONLY',providerAuthentication:'NOT_PROVEN'};
    for (const candidate of projection.candidates) {
      const measurement=byDigest.get(candidate.recordSha256);
      const peers=measurement ? cohorts.get(measurement.key).filter(v=>v.sha!==candidate.recordSha256).map(v=>v.rate).sort((a,b)=>a-b) : [];
      const mid=Math.floor(peers.length/2);
      const median=peers.length%2?peers[mid]:(peers[mid-1]+peers[mid])/2;
      if (!measurement || peers.length<30 || !(median>0) || measurement.rate/median<1.5 || 100*peers.filter(v=>v<measurement.rate).length/peers.length<90) { result.blocked.engagement++; continue; }
      const signal=editorial.get(candidate.recordSha256);
      if (!signal || eGrants.get(viralRecordDigest(signal,'signal'))!==1) { result.blocked.editorial++; continue; }
      const pattern=classifyHook(signal.hookSummary),trigger=classifyTrigger(signal.hookSummary);
      if (pattern==='UNCLASSIFIED') { result.blocked.editorial++; continue; }
      const ranked=products.map(p=>({p,score:scoreFit(signal,p)})).filter(v=>v.score>=70).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
      if (!ranked.length || (ranked.length>1 && ranked[0].score===ranked[1].score)) { result.blocked.productFit++; continue; }
      const {p,score}=ranked[0], productDigest=viralRecordDigest(p,'product');
      const signalDigest=viralRecordDigest(signal,'signal');
      const refs=[trustedAnalyticsGrants.find(g=>exact(g,['recordSha256','analyticsAllowed','evidenceRef'])&&g.recordSha256===candidate.recordSha256&&g.analyticsAllowed===true&&typeof g.evidenceRef==='string'&&/^[A-Za-z0-9_.:/#-]{6,220}$/.test(g.evidenceRef))?.evidenceRef,
        trustedEditorialGrants.find(g=>validGrant(g)&&g.sha256===signalDigest)?.evidenceRef,
        trustedEngagementGrants.find(g=>validGrant(g)&&g.sha256===measurement.engagementSha)?.evidenceRef,
        trustedProductGrants.find(g=>validGrant(g)&&g.sha256===productDigest)?.evidenceRef];
      const key=hash([VIRAL_PRODUCT_VERSION,BRAND_VERSION,candidate.recordSha256,measurement.engagementSha,signalDigest,productDigest,score,pattern,trigger,refs]);
      const now=clock();let entry=cache.get(key),fromDisk=false;
      if ((!entry||now<entry.created||now-entry.created>600000)&&persistentCache) {entry=persistentCache.read(key,now);fromDisk=!!entry;}
      let assets;
      if (entry && Number.isFinite(now) && now>=entry.created && now-entry.created<=600000) { assets=structuredClone(entry.assets); result.cacheHits++;if(fromDisk){result.diskCacheHits++;if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,{created:entry.created,assets:structuredClone(assets)});} }
      else {
        assets=createAssets(p,pattern);
        const x=assets.x_post;
        // Standard weighted length: URL contributes 23; non-single-weight characters count twice.
        if (xWeight([x.hook,x.body,'Mehr erfahren: '].join(' '))+23>270) { result.blocked.productFit++; continue; }
        if (Number.isFinite(now)) { if (cache.size>=64) cache.delete(cache.keys().next().value); cache.set(key,{created:now,assets:structuredClone(assets)});if(persistentCache)persistentCache.write(key,now,assets); }
      }
      result.selectedOpportunities.push({sourcePlatform:candidate.sourcePlatform,recordSha256:candidate.recordSha256,pattern,trigger,correlationScore:score,productId:p.id,productSourceSha:p.sourceSha,productContextSha256:productDigest,productBridgeLogic:p.topic+': '+p.benefit+' Beispiel: '+p.walkthrough,canonicalUrl:p.url,audience:p.audienceId,metricEvidence:{views:candidate.views,medianPeerViews:candidate.medianPeerViews,engagementRate:measurement.rate,medianPeerEngagementRate:median,engagementPeerCount:peers.length,status:'SOURCE_RECORDED_NOT_AUTHENTICATED'},generatedAssets:assets,review:'REVIEW_REQUIRED',publicPublishAllowed:false});
    }
    if (projection.analyzedTrendsCount) result.status='SOURCE_RECORDED_NOT_AUTHENTICATED';
    return result;
  };
}
