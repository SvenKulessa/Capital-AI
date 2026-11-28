// Existing Growth Intelligence draft-only product/channel projection. No network or publication.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const PRODUCT_REGISTRY_PATH = "docs/product/MONETIZABLE-PRODUCT-REGISTRY.md";
const channels = {
  "acti": {"kind":"DIRECTORY","url":"https://openacti.com/","source":"https://openacti.com/terms/","rule":"REVIEW_REQUIRED","method":"Acts/Skills Community; nur bereinigte, zur Weitergabe autorisierte Workflows; öffentliche Plugin-API und Verkäuferauszahlung nicht nachgewiesen.","automation":"NOT_PROVEN"},
  "chatgptApps": {"kind":"DISTRIBUTION","url":"https://developers.openai.com/plugins/deploy/submission","source":"https://developers.openai.com/plugins/plugin-guidelines","rule":"LISTING_REVIEW_REQUIRED","method":"MCP-Plugin, Privacy Policy und Review; keine digitalen Verkäufe, Credits, Abos oder indirekten Upsells ohne zulässigen Policy-Pfad.","automation":"PORTAL_REVIEW"},
  "gptStore": {"kind":"DIRECTORY","url":"https://chatgpt.com/gpts","source":"https://help.openai.com/en/articles/8554397-creating-and-editing-gpts","rule":"REVIEW_REQUIRED","method":"Persönliche Konten können keine neuen GPTs erstellen oder publizieren; verwaltete Workspaces und Migration separat prüfen.","automation":"NOT_PROVEN"},
  "notionConnections": {"kind":"DIRECTORY","url":"https://www.notion.com/connections","source":"https://www.notion.com/help/create-integrations-with-the-notion-api","rule":"LISTING_REVIEW_REQUIRED","method":"Öffentliche Connection mit Installation in beliebigen Workspaces; OAuth, Datenschutz, minimale Rechte und Gallery-Prüfung.","automation":"PORTAL_REVIEW"},
  "githubReleases": {"kind":"DISTRIBUTION","url":"https://github.com/","source":"https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases","rule":"REVIEW_REQUIRED","method":"Versionsgebundene Release-Artefakte; Lizenz, Signatur, SHA und Zugriffsrechte prüfen.","automation":"RELEASE_API_DOCUMENTED"},
  "mcpRegistry": {"kind":"DIRECTORY","url":"https://registry.modelcontextprotocol.io/","source":"https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx","rule":"LISTING_REVIEW_REQUIRED","method":"Nur Server-Metadaten; öffentlich erreichbarer Server oder öffentlich installierbares Paket und Namespace-Nachweis erforderlich.","automation":"PACKAGE_PUBLISH_DOCUMENTED"},
  "npmRegistry": {"kind":"DISTRIBUTION","url":"https://www.npmjs.com/","source":"https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/","rule":"REVIEW_REQUIRED","method":"Öffentliches npm-Paket mit Namespace, README, Lizenzprüfung und sicherem Publishing; keine privaten Daten paketieren.","automation":"PACKAGE_PUBLISH_DOCUMENTED"},
  "pypi": {"kind":"DISTRIBUTION","url":"https://pypi.org/","source":"https://packaging.python.org/en/latest/tutorials/packaging-projects/","rule":"REVIEW_REQUIRED","method":"Wheel/sdist, Projektname, Metadaten und Trusted Publishing prüfen; Abhängigkeiten und Rechte prüfen.","automation":"PACKAGE_PUBLISH_DOCUMENTED"},
  "ghcr": {"kind":"DISTRIBUTION","url":"https://ghcr.io/","source":"https://docs.github.com/en/billing/concepts/product-billing/github-packages","rule":"REVIEW_REQUIRED","method":"OCI-Image, Digest, SBOM, Provenienz, Signaturen und Registry-Berechtigungen prüfen.","automation":"PACKAGE_PUBLISH_DOCUMENTED"},
  "vscodeMarketplace": {"kind":"DISTRIBUTION","url":"https://marketplace.visualstudio.com/","source":"https://code.visualstudio.com/api/working-with-extensions/publishing-extension","rule":"LISTING_REVIEW_REQUIRED","method":"VSIX, Publisher und Extension-Manifest; Least Privilege, Sicherheitsprüfung und Support.","automation":"PACKAGE_PUBLISH_DOCUMENTED"},
  "rapidApi": {"kind":"DISTRIBUTION","url":"https://rapidapi.com/","source":"https://docs.rapidapi.com/docs/hub-listing-monetize-tab","rule":"LISTING_REVIEW_REQUIRED","method":"Nur dokumentierte API mit Rate Limits, Auth, Datenschutz, Produktrechten und Support; kein bestehendes API-Produkt angenommen.","automation":"PORTAL_REVIEW"},
  "microsoftMarketplace": {"kind":"DISTRIBUTION","url":"https://partner.microsoft.com/dashboard","source":"https://learn.microsoft.com/en-us/partner-center/marketplace-offers/submission-api-overview","rule":"LISTING_REVIEW_REQUIRED","method":"SaaS Submission API; Partner Center, Entra, Review und Fulfillment prüfen.","automation":"API_SUBMISSION_DOCUMENTED"},
  "awsMarketplace": {"kind":"DISTRIBUTION","url":"https://aws.amazon.com/marketplace/management/","source":"https://docs.aws.amazon.com/marketplace/latest/developerguide/work-with-saas-products.html","rule":"LISTING_REVIEW_REQUIRED","method":"Catalog API StartChangeSet; Seller-Onboarding, Billing und Review prüfen.","automation":"API_SUBMISSION_DOCUMENTED"},
  "googleCloudMarketplace": {"kind":"DISTRIBUTION","url":"https://console.cloud.google.com/producer-portal","source":"https://docs.cloud.google.com/marketplace/docs/partners/integrated-saas/submitting","rule":"LISTING_REVIEW_REQUIRED","method":"Producer Portal; allgemeine Listing-Write-API nicht nachgewiesen.","automation":"PORTAL_REVIEW"},
  "notionMarketplace": {"kind":"DISTRIBUTION","url":"https://www.notion.com/become-a-creator","source":"https://www.notion.com/help/selling-on-marketplace","rule":"LISTING_REVIEW_REQUIRED","method":"Nur passende Notion-Vorlagen; Creator-Profil und Review.","automation":"PORTAL_REVIEW"},
  "gumroad": {"kind":"DISTRIBUTION","url":"https://gumroad.com/mcp","source":"https://gumroad.com/help/article/355-connect-ai-assistants-to-gumroad","rule":"LISTING_REVIEW_REQUIRED","method":"Offizielles MCP für unveröffentlichte Entwürfe und separate Veröffentlichung; Rechte, OAuth und Produktart prüfen.","automation":"MCP_DRAFT_AND_PUBLISH_DOCUMENTED"},
  "lemonSqueezy": {"kind":"OWNED","url":"https://www.lemonsqueezy.com/","source":"https://docs.lemonsqueezy.com/help/products/adding-products","rule":"LISTING_REVIEW_REQUIRED","method":"Dashboard-Produktanlage; Produkt-Readback per API; kein Create-Endpunkt angenommen.","automation":"PORTAL_CREATE_API_READ"},
  "paddle": {"kind":"OWNED","url":"https://www.paddle.com/","source":"https://developer.paddle.com/api-reference/products/create-product/","rule":"LISTING_REVIEW_REQUIRED","method":"Katalog-API; keine garantierte Marketplace-Reichweite oder zweite Billing-Authority.","automation":"API_CATALOG_DOCUMENTED"},
  "stripeDirect": {"kind":"OWNED","url":"https://dashboard.stripe.com/","source":"https://docs.stripe.com/api/products/create","rule":"REVIEW_REQUIRED","method":"Bestehende Stripe-Integration und Preisautorität wiederverwenden; Sandbox vor Live-Vertrieb.","automation":"API_CATALOG_DOCUMENTED"},
  "atlassianMarketplace": {"kind":"DISTRIBUTION","url":"https://marketplace.atlassian.com/","source":"https://developer.atlassian.com/platform/marketplace/rest/v4/api-group-app-listing","rule":"LISTING_REVIEW_REQUIRED","method":"Nur kompatible Atlassian-Apps; Listing-/Versions-API, Erstaufnahme und Review prüfen.","automation":"API_LISTING_DOCUMENTED"},
  "googlePlay": {"kind":"DISTRIBUTION","url":"https://play.google.com/console/","source":"https://developers.google.com/android-publisher/edits/","rule":"LISTING_REVIEW_REQUIRED","method":"Android-App mit bestehendem Package und Signatur; Edits für Listings/Releases; Erstaufnahme und Review prüfen.","automation":"API_EXISTING_APP_EDITS"},
  "chromeWebStore": {"kind":"DISTRIBUTION","url":"https://chrome.google.com/webstore/devconsole","source":"https://developer.chrome.com/docs/webstore/api","rule":"LISTING_REVIEW_REQUIRED","method":"Nur echte Erweiterungen; erstes Item im Dashboard, spätere Releases per API.","automation":"API_EXISTING_ITEM_RELEASES"},
  "googleWorkspaceMarketplace": {"kind":"DISTRIBUTION","url":"https://workspace.google.com/marketplace/","source":"https://developers.google.com/workspace/marketplace/how-to-publish","rule":"LISTING_REVIEW_REQUIRED","method":"Nur integrierte Workspace-App; SDK, OAuth und Review; allgemeine Listing-Write-API nicht nachgewiesen.","automation":"PORTAL_REVIEW"},
  "website": {
    "kind": "OWNED",
    "url": "https://capital-ai.online/",
    "source": "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
    "rule": "REVIEW_REQUIRED",
    "method": "Suchoptimierte Produktseite, Dokumentation und belegbare Demo; Checkout erst nach Commerce-Freigabe.",
    "automation": "NOT_PROVEN"
  },
  "acode": {
    "kind": "DISTRIBUTION",
    "url": "https://acode.app/",
    "source": "https://docs.acode.app/docs/getting-started/create-plugin",
    "rule": "LISTING_REVIEW_REQUIRED",
    "method": "Kostenloses Plugin-Listing vorbereiten; unabhängige Lizenzierung separat prüfen. Keine externen Kaufverweise im mobilen Plugin.",
    "automation": "CI_PUBLISH_DOCUMENTED"
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
    "method": "GitHub-App-Listing im Portal einreichen; REST-API für Pläne/Käufe, kein Listing-Create-Endpunkt nachgewiesen. Publisher-Anforderungen und getrennte Entitlements beachten.",
    "automation": "PORTAL_CREATE_API_READ"
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
  "saas": {"audience":"B2B-SaaS-Kunden und technische Entscheider","groups":[["website","stripeDirect","linkedin"],["microsoftMarketplace","awsMarketplace","googleCloudMarketplace","paddle","productHunt"],[]],"queries":["B2B SaaS buyer requirements","Cloud marketplace SaaS listing"],"asset":"Belegte SaaS-Demo, Datenschutz, Support und Fulfillment-Konzept."},
  "integration": {"audience":"Workspace- und Developer-Integrationen","groups":[["website"],["atlassianMarketplace","googleWorkspaceMarketplace","chromeWebStore"],[]],"queries":["integration marketplace eligibility"],"asset":"Nur nachgewiesene kompatible Integration und minimale Berechtigungen."},
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
        "googlePlay",
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
        "youtube",
        "stripeDirect"
      ],
      [
        "gumroad",
        "lemonSqueezy",
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
        "x",
        "gumroad",
        "notionMarketplace"
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
  if(["saas-membership","b2b-data-api","sentiment-api","white-label-widgets","enterprise-scorer"].includes(id))return "saas";
  if(id==="hero-buddy-support")return "integration";
  if(id==="ai-smartcopy"||id==="smartclip")return "mobile";
  if(id==="cads-benchmark-engine")return "cads";
  if(["market-vocabulary","learning-portal"].includes(id))return "learning";
  if(["oss-pipeline-simulation-engine","ghcr-digest-blueprint-marketplace-app","seo-growth-engine","social-media-engine","digital-blueprints","solo2-rag","loop-agent","eif"].includes(id))return "engineering";
  return null;
}
const supplementalMatches = {"ai-smartcopy":["githubReleases"],"smartclip":["githubReleases"],"solo2-rag":["acti","mcpRegistry","pypi","githubReleases"],"loop-agent":["mcpRegistry","pypi","ghcr","githubReleases"],"digital-blueprints":["githubReleases"],"cads-benchmark-engine":["githubReleases","ghcr"],"hero-buddy-support":["notionConnections","chatgptApps"],"learning-portal":["notionMarketplace"],"market-vocabulary":["notionMarketplace"],"b2b-data-api":["rapidApi"],"sentiment-api":["rapidApi"],"oss-pipeline-simulation-engine":["ghcr","githubReleases"]};
export function projectProductChannels(markdown) {
  const rows=parseProductRegistry(markdown);
  const existing=new Set(rows.map(p=>p.id));
  for(const e of extras)if(!existing.has(e.id))rows.push({id:e.id,name:e.name,sourceStatus:e.sourceStatus,...(e.sourceRefs?{sourceRefs:e.sourceRefs}:{})});
  return {
    contractVersion:"CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1",publicationState:"DRAFT_ONLY",publicPublishAllowed:false,liveSalesAllowed:false,providerCalls:0,campaignSpend:0,scoreBasis:"EDITORIAL_HYPOTHESIS_NOT_MEASURED",channelSourceReviewDate:"2026-11-28",
    products:rows.map(p=>{
      const profile=profiles[profileFor(p.id)];
      return {...p,profile:profileFor(p.id),currentCommercialReadiness:"NOT_PROVEN",audience:profile?.audience??null,
        researchStatus:profile?"CANDIDATES_REVIEW_REQUIRED":"UNMAPPED_RESEARCH_REQUIRED",
        discoveryQueries:profile?.queries??[p.id+" target users distribution channels",p.id+" official marketplace requirements"],
        assetBrief:profile?.asset??null,
        channels:profile?profile.groups.map((ids,i)=>i===1?[...new Set([...ids,...(supplementalMatches[p.id]??[])].filter(id=>!profile.groups[0].includes(id)))]:ids).flatMap((ids,i)=>ids.map(id=>({id,priority:"P"+i,...channels[id],automation:channels[id].automation??'NOT_PROVEN',accountAdmission:'NOT_PROVEN',costAdmission:'NOT_PROVEN',reviewRequired:true,automaticPublishAllowed:false,paidActivationAllowed:false,externalPurchaseLinkInPluginAllowed:false,metrics:{reach:null,visits:null,conversions:null,revenue:null}}))):[]};
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

// Derived catalog: no second product registry, provider calls or commercial authority.
const marketplacePriority = ['stripeDirect','gumroad','githubMarketplace','microsoftMarketplace','awsMarketplace'];
const commercialEvidence = {
  "stripeDirect": [
    "OWN_CHECKOUT",
    [
      "SAAS",
      "BLUEPRINT",
      "PLUGIN"
    ],
    "Bestehende Preisautorität; keine Checkout-Freigabe aus Katalog."
  ],
  "gumroad": [
    "DIRECT_MARKETPLACE",
    [
      "BLUEPRINT",
      "PLUGIN",
      "LEARNING"
    ],
    "Merchant-of-record und Produktzulassung vertraglich prüfen."
  ],
  "githubMarketplace": [
    "DIRECT_MARKETPLACE",
    [
      "PLUGIN",
      "SAAS"
    ],
    "Nur geeignete GitHub-App; Organisation, Financial Onboarding, Review und Billing-Events."
  ],
  "notionMarketplace": [
    "DIRECT_MARKETPLACE",
    [
      "WORKFLOW",
      "LEARNING"
    ],
    "Nur geeignete Templates; Creator-Zulassung und Stripe-Onboarding."
  ],
  "googlePlay": [
    "DIRECT_MARKETPLACE",
    [
      "ANDROID_APP"
    ],
    "Regionale Play-Billing-Regeln und Entwicklerzulassung separat prüfen."
  ],
  "acode": [
    "RESTRICTED_OR_UNVERIFIED",
    [
      "PLUGIN"
    ],
    "Kostenloses Listing/CI-Publishing belegt; neue Paid-Plugins und Preisänderungen per CI nicht erlaubt."
  ],
  "website": [
    "OWN_CHECKOUT",
    [
      "SAAS",
      "BLUEPRINT",
      "LEARNING",
      "PLUGIN"
    ],
    "Eigener Vertrieb; Stripe und Owner-Freigabe bleiben separate Gates."
  ],
  "acti": [
    "DISCOVERY_ONLY",
    [
      "WORKFLOW"
    ],
    "Acts/Skills Community; nur bereinigte, zur Weitergabe autorisierte Workflows; öffentliche Plugin-API und Verkäuferauszahlung nicht nachgewiesen."
  ],
  "chatgptApps": [
    "NO_DIGITAL_COMMERCE",
    [
      "MCP",
      "PLUGIN"
    ],
    "MCP-Plugin, Privacy Policy und Review; keine digitalen Verkäufe, Credits, Abos oder indirekten Upsells ohne zulässigen Policy-Pfad."
  ],
  "gptStore": [
    "RESTRICTED_OR_UNVERIFIED",
    [
      "WORKFLOW"
    ],
    "Persönliche Konten können keine neuen GPTs erstellen oder publizieren; verwaltete Workspaces und Migration separat prüfen."
  ],
  "notionConnections": [
    "DISCOVERY_ONLY",
    [
      "PLUGIN",
      "API"
    ],
    "Öffentliche Connection mit Installation in beliebigen Workspaces; OAuth, Datenschutz, minimale Rechte und Gallery-Prüfung."
  ],
  "githubReleases": [
    "PACKAGE_DISTRIBUTION",
    [
      "CLI",
      "BLUEPRINT",
      "PLUGIN"
    ],
    "Versionsgebundene Release-Artefakte; Lizenz, Signatur, SHA und Zugriffsrechte prüfen."
  ],
  "mcpRegistry": [
    "DISCOVERY_ONLY",
    [
      "MCP"
    ],
    "Nur Server-Metadaten; öffentlich erreichbarer Server oder öffentlich installierbares Paket und Namespace-Nachweis erforderlich."
  ],
  "npmRegistry": [
    "PACKAGE_DISTRIBUTION",
    [
      "CLI",
      "MCP",
      "SDK"
    ],
    "Öffentliches npm-Paket mit Namespace, README, Lizenzprüfung und sicherem Publishing; keine privaten Daten paketieren."
  ],
  "pypi": [
    "PACKAGE_DISTRIBUTION",
    [
      "CLI",
      "MCP",
      "SDK"
    ],
    "Wheel/sdist, Projektname, Metadaten und Trusted Publishing prüfen; Abhängigkeiten und Rechte prüfen."
  ],
  "ghcr": [
    "PACKAGE_DISTRIBUTION",
    [
      "CONTAINER",
      "MICROSERVICE"
    ],
    "OCI-Image, Digest, SBOM, Provenienz, Signaturen und Registry-Berechtigungen prüfen."
  ],
  "vscodeMarketplace": [
    "DISCOVERY_ONLY",
    [
      "PLUGIN"
    ],
    "VSIX, Publisher und Extension-Manifest; Least Privilege, Sicherheitsprüfung und Support."
  ],
  "rapidApi": [
    "DIRECT_MARKETPLACE",
    [
      "API"
    ],
    "Nur dokumentierte API mit Rate Limits, Auth, Datenschutz, Produktrechten und Support; kein bestehendes API-Produkt angenommen."
  ]
};
const feeEvidence = {
  "acti": ["Community-Sharing dokumentiert; Creator-Gebühren, native Verkäufe und Auszahlung NOT_PROVEN.","https://openacti.com/terms/"],
  "chatgptApps": ["Digitale Produkte/Dienste nicht für Plugin-Commerce zugelassen; keine Verkäufergebühr oder Auszahlung angenommen.","https://developers.openai.com/plugins/build/monetization"],
  "gptStore": ["Neuer Vertrieb für persönliche Konten blockiert; keine allgemein verfügbare Vergütung angenommen.",null],
  "notionConnections": ["Native Bezahlung von Connections nicht nachgewiesen; Template-Verkauf ist ein separater Kanal.",null],
  "githubReleases": ["Release-Distribution dokumentiert, kein nativer Verkäufer-Checkout; separate Vertrags- und Hostingkosten prüfen.",null],
  "mcpRegistry": ["Metadaten-Registry, keine Artefaktbereitstellung oder Verkäuferabrechnung nachgewiesen.",null],
  "npmRegistry": ["Öffentliche Paketdistribution dokumentiert; keine native Bezahlung pro Paket angenommen.",null],
  "pypi": ["Paketdistribution; keine native Verkäuferabrechnung angenommen.",null],
  "ghcr": ["Container-Image-Speicher und Bandbreite derzeit kostenlos laut GitHub; Änderung und andere Packages-Kosten separat prüfen.","https://docs.github.com/en/billing/concepts/product-billing/github-packages"],
  "vscodeMarketplace": ["Extension-Publishing dokumentiert; native Gebühren oder Verkäuferauszahlungen für dieses Produkt NOT_PROVEN.",null],
  "rapidApi": ["20% Marketplace-Gebühr; zusätzliche PayPal-Auszahlungsgebühren; Auszahlung nach Abrechnung des Folgemonats, Zulassung prüfen.","https://docs.rapidapi.com/v2.0/docs/payouts-and-finance"],
  "notionMarketplace": ["8% + 0,40 USD pro Transaktion laut Notion; Länder, Währung, Auszahlung und mögliche Zusatzkosten prüfen.","https://www.notion.com/help/selling-on-marketplace"],
  "googlePlay": ["Servicegebühr abhängig von Region, Programm und Transaktion; konkrete Gebühren vor Release prüfen.","https://support.google.com/googleplay/android-developer/answer/112622"],
  "acode": ["Neue Paid-Plugins und Preisänderungen werden beim CI-Upload abgelehnt; native Verkäuferkonditionen NOT_PROVEN.","https://docs.acode.app/docs/getting-started/publish-from-ci"],
  "stripeDirect": [
    "Zahlungsart- und vertragsspezifische Gebühren",
    "https://stripe.com/de/pricing"
  ],
  "gumroad": [
    "Direkt: 10% + 0,50 USD; Discover: 30%; mögliche weitere Verarbeitungskosten prüfen",
    "https://gumroad.com/pricing"
  ],
  "githubMarketplace": [
    "5% Einbehalt; Organisations-Publisher und Auszahlungsvoraussetzungen",
    "https://docs.github.com/en/apps/github-marketplace/selling-your-app-on-github-marketplace/receiving-payment-for-app-purchases"
  ],
  "microsoftMarketplace": [
    "Standard Store Service Fee 3%; Ausnahmen/Vertragsbedingungen prüfen",
    "https://learn.microsoft.com/en-gb/partner-center/marketplace-offers/marketplace-commercial-transaction-capabilities-and-considerations"
  ],
  "awsMarketplace": [
    "Listing-Gebühren abhängig von Angebotsart, Vertragswert und Region",
    "https://docs.aws.amazon.com/marketplace/latest/userguide/listing-fees.html"
  ]
};
const marketplaceHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function projectMarketplaceCatalog(plan) {
  if(plan?.contractVersion!=='CAPITAL_AI_PRODUCT_CHANNEL_INTELLIGENCE@1'||plan.publicationState!=='DRAFT_ONLY'||plan.publicPublishAllowed!==false||plan.liveSalesAllowed!==false||plan.providerCalls!==0||plan.campaignSpend!==0||!Array.isArray(plan.products)||plan.products.length>133||!(/^[a-f0-9]{64}$/).test(plan.sourceSha256??''))throw Error('MARKETPLACE_PLAN_INVALID');
  const ids=[...marketplacePriority,...Object.keys(channels).filter(id=>channels[id].automation&&!marketplacePriority.includes(id))];
  const rows=ids.map(id=>{
    const c=channels[id];
    const products=plan.products.filter(p=>p.channels?.some(x=>x.id===id)).map(p=>p.id).sort();
    if(new Set(products).size!==products.length||products.some(p=>typeof p!=='string'||!(/^[a-z0-9-]{1,80}$/).test(p)))throw Error('MARKETPLACE_PRODUCT_INVALID');
    const evidence=commercialEvidence[id];
    return {id,url:c.url,source:c.source,automation:c.automation,feeNote:feeEvidence[id]?.[0]??'Gebühren und Account-Konditionen separat prüfen',feeSource:feeEvidence[id]?.[1]??null,products,distributionMode:evidence?.[0]??'UNKNOWN',productTypes:evidence?.[1]??[],reviewedOn:evidence?'2026-11-28':null,nextReviewOn:evidence?'2026-12-12':null,policyNote:evidence?.[2]??'Aktuelle Anbieterprüfung erforderlich'};
  });
  const catalogSha256=marketplaceHash({sourceSha256:plan.sourceSha256,rows});
  return {schema:'CAPITAL_AI_MARKETPLACE_CATALOG@2',state:'DRAFT_ONLY',sourceSha256:plan.sourceSha256,catalogSha256,rows,accountAdmission:'NOT_PROVEN',costAdmission:'NOT_PROVEN',rightsAdmission:'NOT_PROVEN',ownerApproval:'NOT_GRANTED',publicationAllowed:false,providerCalls:0,spendCents:0};
}
export function planMarketplaceDraft(input) {
  if(!input||Object.keys(input).sort().join(',')!=='catalogSha256,channelId,productId'||typeof input.channelId!=='string'||typeof input.productId!=='string')throw Error('MARKETPLACE_DRAFT_INVALID');
  const catalog=projectMarketplaceCatalog(buildProductChannelIntelligence());
  if(input.catalogSha256!==catalog.catalogSha256||!catalog.rows.some(r=>r.id===input.channelId&&r.products.includes(input.productId)))throw Error('MARKETPLACE_DRAFT_NOT_MAPPED_OR_STALE');
  return {schema:'CAPITAL_AI_MARKETPLACE_DRAFT@1',draftKey:marketplaceHash([catalog.catalogSha256,input.channelId,input.productId]),channelId:input.channelId,productId:input.productId,catalogSha256:catalog.catalogSha256,state:'DRAFT_ONLY',adapterMode:'OFFLINE_PREVIEW',price:null,providerCalls:0,spendCents:0,rightsAdmission:'NOT_PROVEN',ownerApproval:'NOT_GRANTED',publicationAllowed:false};
}
