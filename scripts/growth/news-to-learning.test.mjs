import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfficialRss,fetchOfficialNews,buildNewsLearningDraft,OFFICIAL_NEWS_FEEDS} from './news-to-learning.mjs';

const asOf = new Date('2026-11-14T00:00:00.000Z');
const first = {title:'ECB publishes a new overview of financial stability',url:'https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261112~abc.en.html',pubDate:'Thu, 12 Nov 2026 12:00:00 GMT'};
const second = {title:'ECB releases updated statistical information',url:'https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261111~def.en.html',pubDate:'Wed, 11 Nov 2026 12:00:00 GMT'};
const xmlItem = (i) => `<item><title>${i.title}</title><link>${i.url}</link><pubDate>${i.pubDate}</pubDate></item>`;
const feed = (...items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>ECB Press</title>${items.map(xmlItem).join('')}</channel></rss>`;
const bridge = {
  planCampaign: campaign => ({campaign, cadsQuality:{technicalStatus:'PASS'},publication:{publicPublishAllowed:false,adapter:'SOCIAL_MEDIA_ENGINE'}}),
  buildPackage: ({campaign,contentId,assets})=>({campaignId:campaign.campaignId,contentId,assets,
    sourceSha:campaign.sourceSha,publicationAuthority:'SOCIAL_MEDIA_ENGINE_ONLY',approvals:[],deliveries:[]}),
};
const one = () => parseOfficialRss(feed(first),{asOf})[0];

test('official feed is bounded, source-dated and deduplicated deterministically',()=>{
  const records = parseOfficialRss(feed(second,first,first),{asOf});
  assert.equal(records.length,2);
  assert.equal(records[0].title,first.title);
  assert.equal(records[0].publishedAt,'2026-11-12T12:00:00.000Z');
  assert.equal(records[0].eventAt,null);
  assert.equal(records[0].rights,'LICENSE_REVIEW_REQUIRED');
  assert.equal(records[0].feedUrl,OFFICIAL_NEWS_FEEDS.ECB_PRESS.url);
  // Read-only ECB feed extraction on 2026-11-14 contained 15 dated headlines.
  const liveSized = Array.from({length:15},(_,i)=>({
    ...first,
    url:`https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261112~item${i}.en.html`,
  }));
  assert.equal(parseOfficialRss(feed(...liveSized),{asOf}).length,15);
});

test('unapproved feed and hostile URLs fail closed',()=>{
  assert.throws(()=>parseOfficialRss(feed(first),{feed:'EVIL',asOf}),/NEWS_FEED_NOT_ALLOWED/);
  for (const url of [
    'http://www.ecb.europa.eu/press/anything',
    'https://www.ecb.europa.eu.evil.test/press/anything',
    'https://user:secret@www.ecb.europa.eu/press/anything',
    'https://www.ecb.europa.eu:444/press/anything',
    'https://www.ecb.europa.eu@127.0.0.1/press/anything',
    'https://www.ecb.europa.eu/private/anything',
    'https://www.ecb.europa.eu/press/%2fetc/passwd',
    'https://www.ecb.europa.eu/press/a?key=secret',
    'https://www.ecb.europa.eu/press/a#fragment',
  ]) assert.throws(()=>parseOfficialRss(feed({...first,url}),{asOf}),/NEWS_URL_REJECTED/);
});

test('XML entity payloads, duplicate conflicts, missing dates and XSS are rejected',()=>{
  assert.throws(()=>parseOfficialRss('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+feed(first),{asOf}),/NEWS_RSS_REJECTED/);
  assert.throws(()=>parseOfficialRss(feed({...first,title:'<script>alert(1)</script>'}),{asOf}),/NEWS_XML_UNSAFE_TEXT|NEWS_XML_REQUIRED_FIELD|NEWS_RSS_REJECTED/);
  assert.throws(()=>parseOfficialRss(feed({...first,title:'&xxe; Arbitrary payload title'}),{asOf}),/NEWS_XML_UNSAFE_TEXT/);
  assert.throws(()=>parseOfficialRss(feed(first,{...first,title:'Different central bank publication headline'}),{asOf}),/NEWS_DUPLICATE_CONFLICT/);
  assert.throws(()=>parseOfficialRss(feed({...first,pubDate:'nonsense'}),{asOf}),/NEWS_DATE_UNVERIFIED/);
  assert.throws(()=>parseOfficialRss(feed({...first,pubDate:'Mon, 01 Jan 2018 12:00:00 GMT'}),{asOf}),/NEWS_DATE_UNVERIFIED/);
  assert.throws(()=>parseOfficialRss(feed({...first,pubDate:'Sat, 21 Nov 2026 12:00:00 GMT'}),{asOf}),/NEWS_DATE_UNVERIFIED/);
  assert.throws(()=>parseOfficialRss(feed(...Array(33).fill(first)),{asOf}),/NEWS_RSS_ITEM_COUNT/);
});

test('official feed fetch is opt-in and rejects redirects, status and wrong MIME',async()=>{
  const urls=[];
  const fetchImpl=async (url,opts)=>{
    urls.push(url); assert.equal(opts.method,'GET'); assert.equal(opts.redirect,'error'); assert.equal(opts.credentials,'omit');
    return new Response(feed(first),{status:200,headers:{'content-type':'application/rss+xml'}});
  };
  const records=await fetchOfficialNews({asOf,fetchImpl});
  assert.equal(urls.length,1);
  assert.equal(urls[0],OFFICIAL_NEWS_FEEDS.ECB_PRESS.url);
  assert.equal(records.length,1);
  await assert.rejects(fetchOfficialNews({asOf,fetchImpl:async()=>new Response(feed(first),{status:403,headers:{'content-type':'application/rss+xml'}})}),/NEWS_FEED_RESPONSE_REJECTED/);
  await assert.rejects(fetchOfficialNews({asOf,fetchImpl:async()=>new Response(feed(first),{status:200,headers:{'content-type':'text/html'}})}),/NEWS_FEED_RESPONSE_REJECTED/);
  await assert.rejects(fetchOfficialNews({asOf,fetchImpl:async()=>({url:'https://evil.test/rss',ok:true,headers:new Headers({'content-type':'text/xml'}),body:new Response(feed(first)).body})}),/NEWS_REDIRECT_REJECTED/);
});

test('oversized streaming data is stopped before storing the response',async()=>{
  let cancelled=false;
  const oversized=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(160001));},cancel(){cancelled=true;}}),{headers:{'content-type':'application/rss+xml'}});
  await assert.rejects(fetchOfficialNews({asOf,fetchImpl:async()=>oversized}),/NEWS_FEED_OVERSIZE/);
  assert.equal(cancelled,true);
});

test('canonical educational article, traceable evidence and 3 social variants share CADS and draft-only authority',async()=>{
  const built=await buildNewsLearningDraft(one(),bridge);
  assert.equal(built.contractVersion,'CAPITAL_AI_NEWS_TO_LEARNING_DRAFT@1');
  assert.equal(built.article.status,'DRAFT');
  assert.equal(built.article.publishedAt,null);
  assert.equal(built.article.quiz.correctIndex,0);
  assert.equal(built.article.source.licenseStatus,'LICENSE_REVIEW_REQUIRED');
  assert.equal(built.article.source.eventAt,null);
  assert.equal(built.cads.technicalStatus,'PASS');
  assert.equal(built.cads.editorialReview,'REVIEW_REQUIRED');
  assert.equal(built.cads.publicationApproval,false);
  assert.equal(built.publicPublishAllowed,false);
  assert.equal(built.publicationState,'DRAFT_ONLY');
  assert.equal(built.externalGenerations,0);
  assert.deepEqual(built.socialDrafts.map(x=>x.channel),['LINKEDIN','INSTAGRAM','X']);
  for(const item of built.socialDrafts){assert.match(item.text,/Learning Hub/);assert.equal(item.status,'DRAFT');assert.equal(item.sourceSha,built.sourceSha);}
  assert.ok(built.socialDrafts.find(x=>x.channel==='X').text.length<=280);
  assert.equal(built.socialPackage.assets.length,4);
  assert.equal(built.socialPackage.approvals.length,0);
  assert.equal(built.socialPackage.deliveries.length,0);
  assert.equal(built.socialPackage.publicationAuthority,'SOCIAL_MEDIA_ENGINE_ONLY');
  assert.equal((await buildNewsLearningDraft(one(),bridge)).sourceSha,built.sourceSha);
});

test('tampered rights, forged source, and unsafe publication adapters reject with no delivery',async()=>{
  await assert.rejects(buildNewsLearningDraft({...one(),rights:'PUBLIC_DOMAIN'},bridge),/NEWS_SOURCE_EVIDENCE_REQUIRED/);
  await assert.rejects(buildNewsLearningDraft({...one(),url:'https://127.0.0.1/private'},bridge),/NEWS_URL_REJECTED/);
  await assert.rejects(buildNewsLearningDraft({...one(),publishedAt:'invalid'},bridge),/NEWS_SOURCE_EVIDENCE_REQUIRED/);
  await assert.rejects(buildNewsLearningDraft(one(),{...bridge,planCampaign:c=>({campaign:c,cadsQuality:{technicalStatus:'PASS'},publication:{publicPublishAllowed:true}})}),/NEWS_CONTENT_AUTHORITY_REJECTED/);
  await assert.rejects(buildNewsLearningDraft(one(),{...bridge,buildPackage:()=>({publicationAuthority:'SOCIAL_MEDIA_ENGINE_ONLY',approvals:[{approved:true}],deliveries:[]})}),/NEWS_CONTENT_AUTHORITY_REJECTED/);
});
