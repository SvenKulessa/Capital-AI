/**
 * Read-only official RSS -> source-bound Learning/Social drafts.
 * No scheduler, publisher, database, paid API, or authorization changes.
 * The existing Content Engine, Social Package and CADS remain the authorities.
 */
import { createHash } from 'node:crypto';
import { assessCadsContentCampaign } from '../../packages/benchmark-core/growth-quality.mjs';

export const NEWS_TO_LEARNING_VERSION = 'CAPITAL_AI_NEWS_TO_LEARNING_DRAFT@1';
export const OFFICIAL_NEWS_FEEDS = Object.freeze({
  ECB_PRESS: Object.freeze({
    url: 'https://www.ecb.europa.eu/rss/press.html',
    itemHost: 'www.ecb.europa.eu',
    itemPrefix: '/press/',
    institution: 'Europäische Zentralbank',
    rights: 'LICENSE_REVIEW_REQUIRED',
  }),
});
const MAX_FEED_BYTES = 160_000;
// The official ECB press RSS listed 15 dated entries on 2026-11-14; preserve a bounded headroom.
const MAX_ITEMS = 32;
const MAX_AGE_DAYS = 45;
const LEARNING_URL = 'https://capital-ai.online/learning';
const sha256 = data => createHash('sha256').update(data).digest('hex');

function officialUrl(raw, {host, prefix = '/'}) {
  if (typeof raw !== 'string' || raw.length > 1600 || /[\u0000-\u0020\\]/.test(raw)) throw Error('NEWS_URL_REJECTED');
  let url;
  try { url = new URL(raw); } catch { throw Error('NEWS_URL_REJECTED'); }
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password || url.hash
    || url.search || !url.pathname.startsWith(prefix) || /%(?:2f|5c|00)/i.test(url.pathname)) {
    throw Error('NEWS_URL_REJECTED');
  }
  return url.href;
}
function decodeXml(value) {
  const decoded = value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt);/gi, (all, num, entity) => {
      if (num) { const n = num[0].toLowerCase() === 'x' ? parseInt(num.slice(1), 16) : Number(num); return n >= 32 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
      return {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>'}[entity.toLowerCase()];
    });
  if (/[<>\u0000-\u001f\u007f]/.test(decoded) || /&(?:#|[a-z][\w.-]*;)/i.test(decoded)) throw Error('NEWS_XML_UNSAFE_TEXT');
  return decoded.replace(/\s+/g, ' ').trim();
}
function xmlValue(item, tag) {
  const matches = [...item.matchAll(new RegExp(`<${tag}\\s*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi'))];
  if (matches.length !== 1) throw Error('NEWS_XML_REQUIRED_FIELD');
  return decodeXml(matches[0][1]);
}
function isoDate(raw, asOf) {
  const timestamp = Date.parse(raw);
  const ageMs = asOf.getTime() - timestamp;
  if (!Number.isFinite(timestamp) || ageMs < -24 * 60 * 60_000 || ageMs > MAX_AGE_DAYS * 86400_000) {
    throw Error('NEWS_DATE_UNVERIFIED');
  }
  return new Date(timestamp).toISOString();
}
export function parseOfficialRss(xml, {feed = 'ECB_PRESS', asOf = new Date()} = {}) {
  const source = OFFICIAL_NEWS_FEEDS[feed];
  if (!source) throw Error('NEWS_FEED_NOT_ALLOWED');
  if (!(asOf instanceof Date) || !Number.isFinite(asOf.getTime())) throw Error('NEWS_CLOCK_UNVERIFIED');
  if (typeof xml !== 'string' || Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES
    || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<script\b/i.test(xml)
    || !/<rss(?:\s|>)/i.test(xml) || !/<channel(?:\s|>)/i.test(xml)) throw Error('NEWS_RSS_REJECTED');
  const rawItems = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)];
  if (!rawItems.length || rawItems.length > MAX_ITEMS) throw Error('NEWS_RSS_ITEM_COUNT');
  const unique = new Map();
  for (const [,raw] of rawItems) {
    const title = xmlValue(raw, 'title');
    if (title.length < 10 || title.length > 220) throw Error('NEWS_TITLE_REJECTED');
    const url = officialUrl(xmlValue(raw, 'link'), {host: source.itemHost, prefix:source.itemPrefix});
    const publishedAt = isoDate(xmlValue(raw, 'pubDate'), asOf);
    const item = {title, url, publishedAt, institution:source.institution, feedUrl:source.url,
      rights: source.rights, eventAt: null, sourceKind: 'OFFICIAL_RSS_METADATA_ONLY'};
    if (unique.has(url) && JSON.stringify(unique.get(url)) !== JSON.stringify(item)) {
      throw Error('NEWS_DUPLICATE_CONFLICT');
    }
    unique.set(url,item);
  }
  return [...unique.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
}

async function boundedText(response) {
  if (!response?.ok || !/^(application\/(?:rss\+xml|xml)|text\/xml)(?:;|$)/i.test(response.headers?.get('content-type') ?? '')) {
    throw Error('NEWS_FEED_RESPONSE_REJECTED');
  }
  const expected = Number(response.headers.get('content-length'));
  if (response.headers.has('content-length') && (!Number.isSafeInteger(expected) || expected > MAX_FEED_BYTES || expected < 0)) {
    throw Error('NEWS_FEED_OVERSIZE');
  }
  if (!response.body) throw Error('NEWS_FEED_NO_BODY');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FEED_BYTES) throw Error('NEWS_FEED_OVERSIZE');
      chunks.push(value);
    }
  } catch(error) { await reader.cancel().catch(()=>{}); throw error; }
  return new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))));
}
export async function fetchOfficialNews({feed='ECB_PRESS',fetchImpl=fetch,asOf=new Date()} = {}) {
  const source = OFFICIAL_NEWS_FEEDS[feed];
  if (!source) throw Error('NEWS_FEED_NOT_ALLOWED');
  const url = officialUrl(source.url,{host:source.itemHost,prefix:'/rss/'});
  const response = await fetchImpl(url, {method:'GET',redirect:'error',credentials:'omit',
    headers:{accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(8000)});
  if (response.url && response.url !== url) throw Error('NEWS_REDIRECT_REJECTED');
  return parseOfficialRss(await boundedText(response),{feed,asOf});
}

/**
 * Create a structurally valid draft using existing Content Engine and Social Package.
 * In production these adapters are imported from the repository's existing contracts.
 */
export async function buildNewsLearningDraft(news, {planCampaign, buildPackage} = {}) {
  if (!news || news.sourceKind !== 'OFFICIAL_RSS_METADATA_ONLY' || news.rights !== 'LICENSE_REVIEW_REQUIRED'
    || news.feedUrl !== OFFICIAL_NEWS_FEEDS.ECB_PRESS.url || news.institution !== OFFICIAL_NEWS_FEEDS.ECB_PRESS.institution) {
    throw Error('NEWS_SOURCE_EVIDENCE_REQUIRED');
  }
  const source = OFFICIAL_NEWS_FEEDS.ECB_PRESS;
  const url = officialUrl(news.url, {host:source.itemHost,prefix:source.itemPrefix});
  const date = new Date(news.publishedAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== news.publishedAt
    || typeof news.title !== 'string' || news.title.length < 10 || news.title.length > 220
    || /[<>\u0000-\u001f]/.test(news.title)) throw Error('NEWS_SOURCE_EVIDENCE_REQUIRED');
  const sourceSha = sha256(JSON.stringify({feedUrl:source.url,url,title:news.title,publishedAt:news.publishedAt}));
  const contentId = `ecb-learning-${sourceSha.slice(0,16)}`;
  const released = date.toISOString().slice(0,10);
  const article = {
    id: contentId, hub:'learning', status:'DRAFT', review:'REVIEW_REQUIRED', publishedAt:null,
    title:'Zentralbankmeldungen prüfen: Quellen, Zeitpunkt und Wirkung',
    intro:`Die EZB führt am ${released} eine Meldung mit dem Titel „${news.title}“. Dies belegt die Veröffentlichung eines Eintrags, nicht eine bestimmte Marktreaktion.`,
    sections:[
      {title:'Was ist belegt?',body:'Quelle, Titel und Veröffentlichungszeit stammen aus dem offiziellen RSS-Eintrag. Für konkrete Zahlen und Aussagen muss die vollständige Originalmeldung redaktionell geprüft werden.'},
      {title:'Wie ordne ich die Meldung ein?',body:'Trenne Veröffentlichungszeit, Ereigniszeit und mögliche Prognosen. Prüfe Korrekturen, Bezugszeiträume, Definitionen und unabhängige Bestätigungen. Eine Schlagzeile ist keine Kauf- oder Verkaufsempfehlung.'},
      {title:'Lernübung',body:'Beispiel mit synthetischen Werten: Notiere Quelle und Datum. Unterscheide eine beobachtete Kennzahl von einem Szenario. Welche Daten wären nötig, um eine Marktthese zu prüfen?'},
    ],
    quiz:{question:'Was bestätigt der RSS-Eintrag unmittelbar?',answers:['Titel und Veröffentlichungszeitpunkt der Meldung','Eine sichere Kurssteigerung','Die unabhängige Richtigkeit aller Marktprognosen'],correctIndex:0},
    source:{url,feedUrl:source.url,institution:source.institution,publishedAt:news.publishedAt,
      eventAt:null,licenseStatus:'LICENSE_REVIEW_REQUIRED',reusePolicy:'LINK_AND_PARAPHRASE_ONLY',sourceSha},
    disclaimer:'Bildungsinhalt; keine Anlageberatung, keine Live-Kurse oder Renditeprognosen.',
  };
  const socialDrafts = [
    {channel:'LINKEDIN',text:`Neue EZB-Meldung vom ${released}: ${news.title}\n\nWie trennt man Nachricht, Fakten und Marktinterpretation? Wir zeigen eine nachvollziehbare Prüfmethode.\nLearning Hub öffnen: ${LEARNING_URL}`},
    {channel:'INSTAGRAM',text:`FinTech-News verstehen: Was steht in der Originalquelle, wann wurde es veröffentlicht und welche Aussage ist tatsächlich belegt?\n\nBeispiel: EZB-Meldung vom ${released}. Learning Hub öffnen: ${LEARNING_URL}`},
    {channel:'X',text:`EZB-Meldung vom ${released}: Quelle und Veröffentlichungsdatum sind prüfbar. Eine Kursreaktion folgt daraus nicht automatisch. Lernmethode im Learning Hub: ${LEARNING_URL}`},
  ].map(draft=>({...draft,status:'DRAFT',review:'REVIEW_REQUIRED',sourceSha,canonicalUrl:LEARNING_URL}));
  const campaign = {campaignId:contentId,productId:'learning-portal',sourceSha,canonicalUrl:LEARNING_URL,
    locale:'de-DE',objective:'Offizielle FinTech-Meldungen kritisch und überprüfbar einordnen.',
    audience:['Finanzinteressierte','FinTech-Lernende'],channels:['WEBSITE','LINKEDIN','INSTAGRAM','X'],
    outputs:['TEXT'],sourceUrls:[source.url,url]};
  const cads = assessCadsContentCampaign(campaign);
  if (cads.technicalStatus !== 'PASS') throw Error('NEWS_CADS_REJECTED');
  const assets = [
    {assetId:`${contentId}-article`,text:JSON.stringify(article)},
    ...socialDrafts.map(d=>({assetId:`${contentId}-${d.channel.toLowerCase()}`,text:d.text})),
  ].map(asset=>({assetId:asset.assetId,contentId,kind:'TEXT',sha256:sha256(asset.text),mimeType:'text/plain',
    evidenceRef:`official-rss:ECB_PRESS:${sourceSha}`,sourceSha}));
  const planFn = planCampaign ?? (await import('../../src/contracts/contentEngine.ts')).planContentCampaign;
  const packageFn = buildPackage ?? (await import('../../src/contracts/contentSocialPackage.ts')).buildDraftContentSocialPackage;
  const plan = planFn(campaign);
  const socialPackage = packageFn({campaign,contentId,assets});
  if (plan?.cadsQuality?.technicalStatus !== 'PASS' || plan.publication?.publicPublishAllowed !== false
    || socialPackage?.publicationAuthority !== 'SOCIAL_MEDIA_ENGINE_ONLY'
    || socialPackage?.approvals?.length !== 0 || socialPackage?.deliveries?.length !== 0) {
    throw Error('NEWS_CONTENT_AUTHORITY_REJECTED');
  }
  return {contractVersion:NEWS_TO_LEARNING_VERSION,sourceSha,contentId,article,socialDrafts,plan,
    socialPackage,cads,sourceEvidence:article.source,publicationApproval:false,publicPublishAllowed:false,
    externalGenerations:0,publicationState:'DRAFT_ONLY'};
}
