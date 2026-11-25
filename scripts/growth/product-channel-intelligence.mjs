// Existing Growth Intelligence draft-only product/channel projection. No network or publication.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const PRODUCT_REGISTRY_PATH = "docs/product/MONETIZABLE-PRODUCT-REGISTRY.md";
const channels = {
  "website": {
    "kind": "OWNED",
    "url": "https://capital-ai.online/",
    "source": "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
    "rule": "REVIEW_REQUIRED",
    "method": "Suchoptimierte Produktseite, Dokumentation und belegbare Demo; Checkout erst nach Commerce-Freigabe."
  },
  "acode": {
    "kind": "DISTRIBUTION",
    "url": "https://acode.app/",
    "source": "https://docs.acode.app/docs/getting-started/create-plugin",
    "rule": "LISTING_REVIEW_REQUIRED",
    "method": "Kostenloses Plugin-Listing vorbereiten; unabhängige Lizenzierung separat prüfen. Keine externen Kaufverweise im mobilen Plugin."
  },
  "acodeCommunity": {
    "kind": "COMMUNITY",
    "url": "https://github.com/Acode-Foundation",
    "source": "https://github.com/Acode-Foundation",
    "rule": "LOCAL_RULES_REVIEW_REQUIRED",
    "method": "Acode Discord/Telegram: persönliche Demo und Feedback nur im zugelassenen Kanal; keine Massenwerbung."
  },
  "youtube": {
    "kind": "DISCOVERY",
    "url": "https://www.youtube.com/",
    "source": "https://support.google.com/youtube/answer/10059070?hl=en",
    "rule": "REVIEW_REQUIRED",
    "method": "Eigenes Tutorial und vertikales Kurzvideo mit synthetischen Beispielen; keine vertraulichen Terminalausgaben."
  },
  "productHunt": {
    "kind": "LAUNCH",
    "url": "https://www.producthunt.com/",
    "source": "https://help.producthunt.com/en/articles/17734384-5-how-to-promote-your-launch-and-what-to-avoid",
    "rule": "REVIEW_REQUIRED",
    "method": "Erst für ausprobierbares Produkt: Demo, Screenshots und Maker-Kommentare; keine Stimmenanreize."
  },
  "redditShowcase": {
    "kind": "COMMUNITY",
    "url": "https://www.reddit.com/r/droidappshowcase/",
    "source": "https://www.reddit.com/r/androidapps/comments/1rrkvcp/introducing_rdroidappshowcase/",
    "rule": "LOCAL_RULES_REVIEW_REQUIRED",
    "method": "Android-Demo im Showcase-Subreddit nach aktueller Regelprüfung; keine Eigenwerbung in r/androidapps."
  },
  "alternativeTo": {
    "kind": "DIRECTORY",
    "url": "https://alternativeto.net/",
    "source": "https://alternativeto.net/faq/",
    "rule": "LISTING_REVIEW_REQUIRED",
    "method": "Öffentlich verfügbares Produkt mit zutreffender Plattform, Lizenz und Alternativen einreichen."
  },
  "devto": {
    "kind": "COMMUNITY",
    "url": "https://dev.to/",
    "source": "https://dev.to/help/organizations/maximizing-your-dev-organization",
    "rule": "REVIEW_REQUIRED",
    "method": "Nützlicher technischer Erfahrungsbericht mit offengelegter Herstellerrolle; keine reine Werbung."
  },
  "showHN": {
    "kind": "COMMUNITY",
    "url": "https://news.ycombinator.com/showhn.html",
    "source": "https://news.ycombinator.com/newsguidelines.html",
    "rule": "HUMAN_ONLY_NO_GENERATED_TEXT",
    "method": "Nur tatsächlich ausprobierbares, substanzielles Produkt; Beitrag und Antworten vollständig selbst schreiben, nicht automatisieren."
  },
  "githubMarketplace": {
    "kind": "DISTRIBUTION",
    "url": "https://github.com/marketplace",
    "source": "https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app",
    "rule": "LISTING_REVIEW_REQUIRED",
    "method": "GitHub-App-Listing und Publisher-/Plan-Anforderungen nachweisen; Marketplace- und Website-Entitlements getrennt halten."
  },
  "linkedin": {
    "kind": "DISCOVERY",
    "url": "https://www.linkedin.com/",
    "source": "https://business.linkedin.com/advertise/linkedin-pages/best-practices",
    "rule": "REVIEW_REQUIRED",
    "method": "Fachlicher Use Case und nachvollziehbarer Nutzen für technische Entscheider; keine unerbetenen Massen-DMs."
  },
  "x": {
    "kind": "DISCOVERY",
    "url": "https://x.com/",
    "source": "https://help.x.com/en/rules-and-policies/x-automation",
    "rule": "REVIEW_REQUIRED",
    "method": "Kurze originale Demo und technischer Thread; vorhandene X-Publisher-Freigaben und Kostengrenzen unverändert."
  },
  "tiktok": {
    "kind": "DISCOVERY",
    "url": "https://www.tiktok.com/",
    "source": "https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/promoting-a-brand-product-or-service?lang=en",
    "rule": "COMMERCIAL_DISCLOSURE_REQUIRED",
    "method": "Kurzes eigenes Demo-Video, kommerzielle Kennzeichnung aktivieren; Rechte an Ton und Bild separat prüfen."
  }
};
const profiles = {
  "mobile": {
    "audience": "Android-Entwickler und mobile Terminal-Nutzer",
    "groups": [
      [
        "acode",
        "acodeCommunity",
        "youtube",
        "website"
      ],
      [
        "productHunt",
        "redditShowcase",
        "alternativeTo",
        "devto",
        "x",
        "tiktok"
      ],
      [
        "showHN"
      ]
    ],
    "queries": [
      "Acode plugin clipboard terminal automation",
      "Android developer clipboard tools"
    ],
    "asset": "Kurze echte Terminal-Demo: Befehlsabschluss, Exit-Code und Einfügen eines synthetischen Outputs."
  },
  "cads": {
    "audience": "GitHub-App-Nutzer, DevSecOps und Engineering-Leitung",
    "groups": [
      [
        "githubMarketplace",
        "website",
        "devto",
        "linkedin"
      ],
      [
        "youtube",
        "productHunt"
      ],
      [
        "showHN"
      ]
    ],
    "queries": [
      "GitHub Marketplace benchmark developer tools",
      "DevSecOps benchmark evidence"
    ],
    "asset": "Reproduzierbarer Benchmark-Walkthrough mit transparenten Grenzen; keine unbelegten Leistungsversprechen."
  },
  "learning": {
    "audience": "Finanzlernende, Dozenten und Lerncontent-Käufer",
    "groups": [
      [
        "website",
        "youtube"
      ],
      [
        "productHunt",
        "linkedin"
      ],
      []
    ],
    "queries": [
      "Finanzbildung Lernmaterial digitale Lernprodukte",
      "financial literacy learning tools"
    ],
    "asset": "Eigene Lernprobe, Quellen und konkretes Lernziel; keine Anlageempfehlung."
  },
  "engineering": {
    "audience": "Softwareentwickler, IT-Operations und technische Entscheider",
    "groups": [
      [
        "website",
        "devto",
        "youtube",
        "linkedin"
      ],
      [
        "productHunt",
        "x"
      ],
      [
        "showHN"
      ]
    ],
    "queries": [
      "developer workflow automation tools",
      "technical blueprint DevOps evidence"
    ],
    "asset": "Reproduzierbares Beispiel mit dokumentierten Grenzen und Installationsanforderungen."
  }
};
const extras = [
  {
    "id": "ai-smartcopy",
    "name": "AI-Smartcopy",
    "sourceStatus": "PRIVATE_PILOT_CANDIDATE",
    "profile": "mobile"
  },
  {
    "id": "smartclip",
    "name": "SmartClip",
    "sourceStatus": "SEPARATE_PRIVATE_COMMERCE_CANDIDATE",
    "profile": "mobile"
  },
  {
    "id": "digital-blueprints",
    "name": "Digitale Blueprints",
    "sourceStatus": "SOURCE_REVIEWED_DELIVERY_BLOCKED",
    "profile": "engineering",
    "sourceRefs": [
      {
        "path": "CAPITAL-AI-MARKET/BLUEPRINT-CATALOG.md",
        "blobSha": "2c0a0870c96188037465557e76a1eadbd6b76b3e"
      }
    ]
  },
  {
    "id": "solo2-rag",
    "name": "SOLO2 RAG",
    "sourceStatus": "SOURCE_REVIEWED_COMMERCIAL_CANDIDATE",
    "profile": "engineering",
    "sourceRefs": [
      {
        "path": "docs/product/ROADMAP-OSS-SKILL-ORCHESTRATION-20261015.md",
        "blobSha": "9d8927d4a3f0591f94ec8f890e5c97014d3feedb"
      }
    ]
  },
  {
    "id": "loop-agent",
    "name": "Loop Agent",
    "sourceStatus": "SOURCE_REVIEWED_COMMERCIAL_CANDIDATE",
    "profile": "engineering",
    "sourceRefs": [
      {
        "path": "server/loop-agent-product.mjs",
        "blobSha": "8e1ff02df0f0a13dfe5f9e635f55b01c0e55ad97"
      }
    ]
  }
];
export function parseProductRegistry(markdown) {
  if(typeof markdown!=="string"||markdown.length>262144)throw Error("PRODUCT_REGISTRY_INVALID");
  const result=[],seen=new Set();
  let active=false,found=false;
  for(const line of markdown.split(/\r?\n/)){
    if(line.startsWith("| Product | State |")){if(found)throw Error("PRODUCT_REGISTRY_DUPLICATE_TABLE");active=true;found=true;continue;}
    if(!active)continue;
    if(!line.startsWith("|")){active=false;continue;}
    if(/^\|\s*[-:]+\s*\|/.test(line))continue;
    const m=/^\|\s*\[CAPITAL-AI-(?:MARKET|PRODUCT)\]([A-Z0-9-]{1,80})\s*\|/.exec(line);
    if(!m)throw Error("PRODUCT_REGISTRY_ROW_INVALID");
    const id=m[1].toLowerCase();
    if(seen.has(id)||result.length>=128)throw Error("PRODUCT_REGISTRY_DUPLICATE_OR_LIMIT");
    seen.add(id);result.push({id,name:m[1],sourceStatus:"REGISTRY_LISTED_NOT_CURRENT_VERIFIED"});
  }
  if(!found||!result.length)throw Error("PRODUCT_REGISTRY_EMPTY");
  return result;
}
function profileFor(id) {
  if(id==="ai-smartcopy"||id==="smartclip")return "mobile";
  if(id==="cads-benchmark-engine")return "cads";
  if(["market-vocabulary","learning-portal"].includes(id))return "learning";
  if(["oss-pipeline-simulation-engine","ghcr-digest-blueprint-marketplace-app","seo-growth-engine","social-media-engine","digital-blueprints","solo2-rag","loop-agent"].includes(id))return "engineering";
  return null;
}
export function projectProductChannels(markdown) {
  const rows=parseProductRegistry(markdown);
  const existing=new Set(rows.map(p=>p.id));
  for(const e of extras)if(!existing.has(e.id))rows.push({id:e.id,name:e.name,sourceStatus:e.sourceStatus,...(e.sourceRefs?{sourceRefs:e.sourceRefs}:{})});
  return {
    contractVersion:"CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1",publicationState:"DRAFT_ONLY",publicPublishAllowed:false,liveSalesAllowed:false,providerCalls:0,campaignSpend:0,scoreBasis:"EDITORIAL_HYPOTHESIS_NOT_MEASURED",channelSourceReviewDate:"2026-11-25",
    products:rows.map(p=>{
      const profile=profiles[profileFor(p.id)];
      return {...p,profile:profileFor(p.id),currentCommercialReadiness:"NOT_PROVEN",audience:profile?.audience??null,
        researchStatus:profile?"CANDIDATES_REVIEW_REQUIRED":"UNMAPPED_RESEARCH_REQUIRED",
        discoveryQueries:profile?.queries??[p.id+" target users distribution channels",p.id+" official marketplace requirements"],
        assetBrief:profile?.asset??null,
        channels:profile?profile.groups.flatMap((ids,i)=>ids.map(id=>({id,priority:"P"+i,...channels[id],reviewRequired:true,automaticPublishAllowed:false,paidActivationAllowed:false,externalPurchaseLinkInPluginAllowed:false,metrics:{reach:null,visits:null,conversions:null,revenue:null}}))):[]};
    })
  };
}
export function buildProductChannelIntelligence() {
  const bytes = readFileSync(new URL('../../'+PRODUCT_REGISTRY_PATH,import.meta.url));
  return {...projectProductChannels(bytes.toString('utf8')),sourcePath:PRODUCT_REGISTRY_PATH,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceState:'HISTORICAL_REGISTRY_NOT_RUNTIME_EVIDENCE'};
}

export function buildProductChannelGraphHandoff() {
  const plan=buildProductChannelIntelligence();
  return {
    contractVersion:'CAPITAL_AI_PRODUCT_CHANNEL_GRAPH_INPUT@1',
    sourceSha256:plan.sourceSha256,
    publicationState:'DRAFT_ONLY',publicPublishAllowed:false,liveSalesAllowed:false,
    providerCalls:0,campaignSpend:0,
    products:plan.products.map(p=>({id:p.id,researchStatus:p.researchStatus,
      channels:p.channels.map(c=>({id:c.id,priority:c.priority,rule:c.rule}))}))
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length!==3||process.argv[2]!=='--graph-handoff'){
    process.stderr.write('PRODUCT_CHANNEL_CLI_REJECTED\n');
    process.exitCode=1;
  }else{
    try{process.stdout.write(JSON.stringify(buildProductChannelGraphHandoff())+'\n');}
    catch{process.stderr.write('PRODUCT_CHANNEL_HANDOFF_REJECTED\n');process.exitCode=1;}
  }
}
