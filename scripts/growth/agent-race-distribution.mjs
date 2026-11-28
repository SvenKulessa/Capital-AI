// Pure draft projection. No network, persistence, provider auth or publish authority.
const catalog = [
  [
    "website",
    "Universe-7 Championship",
    "LANDING_PAGE",
    "P1",
    "Own site",
    "Trainieren ohne Anmeldung"
  ],
  [
    "instagram",
    "Animal Agent Reels",
    "VERTICAL_VIDEO",
    "P1",
    "https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/instagram-accounts",
    "Challenge über Profil-Link öffnen"
  ],
  [
    "youtube",
    "Prompt Race Shorts",
    "VERTICAL_VIDEO",
    "P1",
    "https://developers.google.com/youtube/data/reference/rest/v3/videos/insert",
    "Challenge über Kanalprofil öffnen"
  ],
  [
    "linkedin",
    "Enterprise Agent Challenge",
    "TEXT_CARD",
    "P1",
    "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api",
    "Benchmark-Aufgabe ansehen"
  ],
  [
    "x",
    "Prompt Duel",
    "TEXT_CARD",
    "P2",
    null,
    "Challenge öffnen"
  ],
  [
    "reddit",
    "Community Benchmark",
    "TEXT_CARD",
    "P2",
    null,
    "Nur moderatorenfreigegebener Beitrag"
  ],
  [
    "discord",
    "Team Agent League",
    "TEXT_CARD",
    "P2",
    null,
    "Nur freigegebener Community-Kanal"
  ],
  [
    "tiktok",
    "30-Second Prompt Race",
    "VERTICAL_VIDEO",
    "P2",
    null,
    "Challenge über Profil öffnen"
  ],
  [
    "github",
    "Developer Skill Challenge",
    "TEXT_CARD",
    "P2",
    null,
    "Reproduzierbare Aufgabe ansehen"
  ],
  [
    "facebook",
    "Community Animal Cup",
    "TEXT_CARD",
    "P3",
    "https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/instagram-accounts",
    "Challenge öffnen"
  ]
];
export function buildRaceDistribution(productPlan){
 if(productPlan?.publicationState!=="DRAFT_ONLY"||productPlan.publicPublishAllowed!==false||productPlan.providerCalls!==0||productPlan.campaignSpend!==0||!productPlan.products?.some(p=>p.id==="agent-race"))throw Error("RACE_PRODUCT_PLAN_INVALID");
 return {schema:"CAPITAL_AI_AGENT_RACE_DISTRIBUTION@1",state:"DRAFT_ONLY",campaignId:"agent-race-pilot-v1",publicPublishAllowed:false,providerCalls:0,campaignSpend:0,liveMetrics:null,channels:catalog.map(([id,title,format,priority,source,cta])=>({id,title,format,priority,source,cta,policyReview:source&&id!=="website"&&id!=="facebook"?"DOCUMENTATION_CANDIDATE":"NOT_PROVEN",publication:"HOLD",link:`https://capital-ai.online/agent-race?utm_source=${id}&utm_medium=${id==="website"?"owned":"organic_social"}&utm_campaign=agent-race-pilot-v1`,routeStatus:"NOT_PROVEN",caption:`${title} – Konzeptvorschau. ${cta}.`,smartClip:format==="VERTICAL_VIDEO"?{target:"SmartClip",state:"STORYBOARD_ONLY",aspectRatio:"9:16",durationSeconds:30,scenes:["Tiercharakter wählen","Prompt und Skills konfigurieren","Training demonstrieren","Challenge-Link anzeigen"],assets:"FIRST_PARTY_RIGHTS_REVIEW_REQUIRED",actualMediaAssets:0}:null})),research:{state:"HYPOTHESIS",questions:["Welche Aufgabe ist für dich relevant?","Würdest du an einer zweiten Challenge teilnehmen?","Welche Funktionen wären dir einen monatlichen Preis wert?"],priceHypothesesCents:[490,990,1990],purchaseEvidence:null,qualifiedDemand:null,thresholds:{minimumConsentedVisitors:100,minimumCompletedChallenges:20,minimumPriceResponses:20},noIncentiveForPositiveResponses:true},attribution:{defaultConsent:"DENIED",analyticsConsentRequired:true,adStorage:"DENIED",adUserData:"DENIED",adPersonalization:"DENIED",noFingerprinting:true,sourceAuthority:"EXISTING_SERVER_CONSENT_LEDGER_AND_VERIFIED_EVENTS",trafficSeparateFromRaceScore:true}};
}
export function reconcileRaceDemand(raw){
 const exact=(v,keys)=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).sort().join(",")===keys.split(",").sort().join(",");
 const hash=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
 const time=v=>typeof v==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
 if(!exact(raw,"asOf,events,consents")||!time(raw.asOf)||!Array.isArray(raw.events)||!Array.isArray(raw.consents)||raw.events.length>1000||raw.consents.length>1000)throw Error("RACE_INPUT_INVALID");
 const now=Date.parse(raw.asOf),ledger=new Map(),seen=new Set(),people=new Map(),allowed=new Set(catalog.map(c=>c[0]));
 for(const c of raw.consents){
 if(!exact(c,"subjectKey,receiptSha256,grantedAt,expiresAt,revokedAt,analytics")||!hash(c.subjectKey)||!hash(c.receiptSha256)||!time(c.grantedAt)||!time(c.expiresAt)||!(c.revokedAt===null||time(c.revokedAt))||typeof c.analytics!=="boolean"||ledger.has(c.subjectKey)||seen.has(c.receiptSha256)||Date.parse(c.grantedAt)>=Date.parse(c.expiresAt)||Date.parse(c.grantedAt)>now||(c.revokedAt!==null&&(Date.parse(c.revokedAt)<Date.parse(c.grantedAt)||Date.parse(c.revokedAt)>now)))throw Error("RACE_CONSENT_INVALID");
 ledger.set(c.subjectKey,c);seen.add(c.receiptSha256);}
 for(const e of raw.events){
 if(!exact(e,"subjectKey,receiptSha256,consentSha256,occurredAt,campaignId,channel,kind,priceCents")||!hash(e.subjectKey)||!hash(e.receiptSha256)||!hash(e.consentSha256)||!time(e.occurredAt)||e.campaignId!=="agent-race-pilot-v1"||!allowed.has(e.channel)||!["VISIT","COMPLETION","PRICE_RESPONSE"].includes(e.kind)||!(e.kind==="PRICE_RESPONSE"?[0,490,990,1990].includes(e.priceCents):e.priceCents===null)||seen.has(e.receiptSha256))throw Error("RACE_EVENT_INVALID");
 seen.add(e.receiptSha256);
 const c=ledger.get(e.subjectKey),t=Date.parse(e.occurredAt);
 if(!c||c.receiptSha256!==e.consentSha256||c.analytics!==true||c.revokedAt!==null||Date.parse(c.grantedAt)>t||Date.parse(c.expiresAt)<=now||t>now||now-t>30*86400000)continue;
 const group=people.get(e.subjectKey)??[];group.push(e);people.set(e.subjectKey,group);}
 let visitors=0,completed=0,responses=0,willing=0;const perChannel={};
 for(const group of people.values()){
 group.sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||a.receiptSha256.localeCompare(b.receiptSha256));
 const visit=group.find(e=>e.kind==="VISIT");if(!visit)continue;visitors++;
 const done=group.find(e=>e.kind==="COMPLETION"&&Date.parse(e.occurredAt)>=Date.parse(visit.occurredAt));
 const price=done&&group.find(e=>e.kind==="PRICE_RESPONSE"&&Date.parse(e.occurredAt)>=Date.parse(done.occurredAt));
 const ch=perChannel[visit.channel]??={visitors:0,completed:0,priceResponses:0};ch.visitors++;
 if(done){completed++;ch.completed++;}if(price){responses++;ch.priceResponses++;if(price.priceCents>0)willing++;}
 }
 const candidateCohort=visitors>=100&&completed>=20&&responses>=20;
 return {schema:"CAPITAL_AI_AGENT_RACE_DEMAND_CANDIDATES@1",state:"SOURCE_RECORDED_NOT_AUTHENTICATED",candidateVisitors:visitors||null,candidateCompleted:completed||null,candidatePriceResponses:responses||null,candidatePositivePriceResponses:responses?willing:null,candidateCohortThresholdMet:candidateCohort,candidateChannels:perChannel,liveVisitors:null,liveConversions:null,actualWillingnessToPay:null,marketValue:null,providerAuthentication:"NOT_PROVEN",publicPublishAllowed:false,providerCalls:0,campaignSpend:0};
}
