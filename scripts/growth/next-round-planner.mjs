import { createHash } from 'node:crypto';
import { readFileSync, readSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { discoverPrivateDomain } from '../../server/growth-private-tool-catalog.mjs';
const DISCOVERY_CLAUSE = "GROWTH_TOOL_DISCOVERY@1: Suche bei der Ausführung aktiv nach aufgabenrelevanten externen Tools, Plugins und kommerziell nutzbaren Alternativen über tatsächlich verfügbare autorisierte Verzeichnisse und offizielle Quellen; vergleiche zuerst vorhandene Integrationen. Verwende ausschließlich nicht vertrauliche Suchbegriffe. Dokumentiere Quelle, Zeitpunkt, Zweck, Version, Kosten, Datenschutz, kommerzielle Nutzungs-, Weitergabe- und Outputrechte sowie Verbindungs-/Runtime-Status getrennt im vorhandenen Owner-Anwendungskatalog. Fehlt eine Suchquelle oder belastbare Rechte-Evidence, kennzeichne dies NOT_PROVEN; keine automatische Installation, Freigabe, Veröffentlichung oder Kostenaktivierung. ";

/**
 * Offline-only next-round draft projection for the existing Social Content Engine.
 * Next-step prose and generated prompts are DATA, never an execution authority.
 * No scheduler, GitHub action, external API, payment, publication or secret access.
 */
export const CONTRACT = 'CAPITAL_AI_NEXT_ROUND_DRAFT@1';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const risks = /[\u202a-\u202e\u2066-\u2069\u200b-\u200f\uFEFF\u0000-\u0008\u000b-\u001f\u007f]/u;

const RECIPES = Object.freeze([
  {id:'skill-bundle-catalog', priority:2, pattern:/skill[s]?[- ](?:bundles?|inventar|katalog|registry|aktualit[aä]t)|quelleninventar|mcp.adapter|a2a.workflow|e2e.integration/i,
   domain:'PLATFORM', skills:['skill-lifecycle','integration-engineering','agent-evaluation','revenue-engineering'],
   title:'Skill-Bundles, Quellen und Integrationen prüfen',
   prompt:'SOLO2: Prüfe die kanonische Skill-Registry und offizielle Referenzen für Founder-, B2B- und Enterprise-Bundles. Trenne Review-Fälligkeit, Adapter- und E2E-Tests, kommerzielle Rechte und Laufzeitbelege. Erfasse fehlende Nachweise und liefere einen Sandbox-Plan für zulässige Verbindungen.'},
  {id:'rights-name', priority:0, pattern:/rechtekette|produktnamen|markenpr[uü]fung|lizenz(?:en|rechte)?|trademark/i,
   domain:'TRUST', skills:['trust-engineering','legal-compliance','growth-advisory'],
   title:'Rechtekette und Produktnamen validieren',
   prompt:'SOLO2: Prüfe für das geplante AgentLoop-Studio-Produkt ausschließlich belegte Code-, Bibliotheks-, Modell-, Medien- und Markenrechte. Liefere eine quellengebundene Commercial-Admission-Matrix mit VERIFIED/BLOCKED/NOT_PROVEN, realen Rechts- und Lizenzlücken, Rollback und minimalen sicheren Folgeschritten. Keine Rechte aus Repository-Text ableiten; kein Kauf, Markenantrag oder Publishing.'},
  {id:'buyer-validation',priority:1,pattern:/design.partner|zahlungsbereitschaft|kundeninterview|zielkunden|kaufbereitschaft/i,
   domain:'PRODUCT',skills:['product-advisory','customer-success','sales-enterprise','revenue-engineering'],
   title:'Design-Partner und Zahlungsbereitschaft prüfen',
   prompt:'SOLO2: Entwirf für AgentLoop Studio einen überprüfbaren B2B-Discovery-Pilot mit fünf Design-Partnern, unabhängigen Fragen zu Schmerz, Zahlungsbereitschaft, Datenhoheit und Preisakzeptanz sowie messbaren Abbruch-/Erfolgskriterien. Nur echte Antworten als Evidence werten, keine erfundenen Kunden, Leads oder Marktdaten und keinen ungefragten Kontakt versenden.'},
  {id:'mvp-architecture',priority:2,pattern:/produktarchitektur|mvp|modulare[sr]? produkt|plugin.architektur|plugin.sdk/i,
   domain:'PLATFORM',skills:['platform-engineering','product-engineering','ai-engineering','trust-engineering'],
   title:'Eigenständige Produktarchitektur und MVP spezifizieren',
   prompt:'SOLO2: Spezifiziere für AgentLoop Studio ein eigenständiges, lizenzrechtlich geprüftes MVP mit Tenant-Isolation, LangGraph-Checkpoints, einem stoppbaren 30-Sekunden-CI-Wait-Supervisor, sicherem Plugin-SDK, GitHub-App und getrennten Terminal-/Cloud-Adaptern. Prüfe Wiederverwendungsrechte und negative Trust-Boundary-Tests. Bestehende CAPITAL-AI-/DeviceCare-KI-Produktionssysteme und Secrets nicht übertragen; keine neuen kostenpflichtigen Dienste aktivieren.'},
  {id:'commerce-sandbox',priority:3,pattern:/stripe|tenant.isolation|checkout|e.commerce|zahlungs.webhook/i,
   domain:'TRUST',skills:['trust-engineering','platform-engineering','revenue-engineering','product-engineering'],
   title:'Stripe-Sandbox und Tenant-Isolation entwickeln',
   prompt:'SOLO2: Plane und prüfe isolierte Stripe-Sandbox-Checkout-/Billing-/Webhook-/Entitlement-Contracts für AgentLoop Studio einschließlich Signatur-, Replay-, Tenant-Cross-Access-, Refund-/Dispute- und Cancel-Negativtests. Ermittle Rechte, Kosten, Steuer- und Datenschutzgrenzen. Keine Live-Keys, Live-Zahlungen, produktive Ressourcen oder Freischaltung ohne gesonderte Owner-Autorisierung.'},
  {id:'commercial-admission',priority:4,pattern:/kommerziell(?:en|er)? betrieb|live.betrieb|verkaufsstart|vor.*abnahme.*freigeben|kommerziellen betrieb/i,
   domain:'TRUST',skills:['trust-engineering','legal-compliance','revenue-engineering','platform-engineering'],
   title:'Kommerziellen Betrieb erst nach vollständiger Abnahme freigeben',
   prompt:'SOLO2: Definiere ein evidenzgebundenes Go/No-Go für AgentLoop Studio: Lizenz-/Markenrechte, Tenant-Isolation, sichere Worker-/Stop-Readbacks, Stripe-Sandbox, Datenschutz, Provider-Verträge, Preis-/Kostenfreigabe und Monitoring. Bericht VERIFIED/BLOCKED/NOT_PROVEN. Kein Produktionsstart, Verkauf oder kostenpflichtiger Dienst auf Basis dieses Entwurfs.'},
]);

/** Extract only list items in the explicitly titled next-steps section. */
export function parseNextSteps(text) {
  if (typeof text !== 'string' || text.length > 12000 || risks.test(text)) throw Error('SOURCE_INVALID');
  const lines = text.normalize('NFC').split(/\r?\n/);
  const start = lines.findIndex(line => /^(?:🔧\s*)?OFFEN\s*\/\s*NÄCHSTE SCHRITTE\s*$/iu.test(line.trim()));
  if (start < 0) return [];
  const steps=[];
  for (const line of lines.slice(start+1)) {
    if (/^\s*(?:#{1,6}\s|\x60{3}|\u2705\s*ERLEDIGT\b)/u.test(line)) break;
    const match = line.match(/^\s*(?:-\s+|\d+[.)]\s+)(.+?)\s*$/u);
    if (!match) { if (steps.length && line.trim()) break; continue; }
    const label = match[1].replace(/\.$/u,'').trim();
    if (!label || label.length>220 || /[<>|{}\x60\\]/u.test(label)) throw Error('STEP_INVALID');
    if (steps.length>=12) throw Error('STEP_LIMIT');
    steps.push(label);
  }
  return [...new Set(steps)];
}

/** Compile non-executable skill and prompt DRAFTS, bound to the canonical registry. */
export function buildNextRoundDrafts(sourceText, registry) {
  if (registry?.authority !== 'AGENTS.md' ||
      registry?.contract !== 'SOLO_MAINTAINER_FLOW@2' ||
      registry?.schemaVersion !== 'CAPITAL_AI_DOMAIN_SKILLS@1' ||
      !registry?.skillGovernance || !registry?.domains) throw Error('REGISTRY_INVALID');
  const steps=parseNextSteps(sourceText);
  const plan=steps.map((step,index)=>{
    const recipe=RECIPES.find(entry=>entry.pattern.test(step));
    if (!recipe) return {index:index+1,recipeId:null,title:'Unbekannter nächster Schritt',state:'HOLD',
      reason:'ROUTING_NOT_PROVEN',suggestedSkills:[],prompt:null};
    const skillSet=[...new Set([registry.domains[recipe.domain]?.engineering,
      registry.domains[recipe.domain]?.advisory,...recipe.skills])];
    if (skillSet.some(skill=>typeof skill!=='string'||!registry.skillGovernance[skill]))
      throw Error('SKILL_NOT_IN_CANONICAL_REGISTRY');
    return {index:index+1,recipeId:recipe.id,title:recipe.title,priority:recipe.priority,
      domain:recipe.domain,state:'DRAFT_ONLY',suggestedSkills:skillSet,
      prompt:recipe.prompt+' '+DISCOVERY_CLAUSE,checksRequired:'FRESH_ROOT_AGENTS_AND_REPO_RULESETS'};
  }).sort((a,b)=>(a.priority??99)-(b.priority??99)||a.index-b.index);
  return {schema:CONTRACT,sourceSha256:sha256(sourceText),
    sourceType:'USER_SUPPLIED_NEXT_STEPS',authority:'NONE',publicationState:'DRAFT_ONLY',
    publicPublishAllowed:false,autoExecuteAllowed:false,autoMergeAllowed:false,
    providerCalls:0,paymentCalls:0,executedSkills:[],nextWake:'REVALIDATE_ON_VERIFIED_CYCLE_COMPLETION',
    pendingCiPollSeconds:30,steps:plan};
}

// Explicit private operator path. Offline draft generation remains provider-free.
// Queries use fixed public topics only; never forward task text, credentials or identities.
export async function buildPrivateNextRoundDrafts(sourceText, registry, {fetchImpl=fetch, now=Date.now}={}) {
  const draft=buildNextRoundDrafts(sourceText,registry);
  const domains=[...new Set(draft.steps.filter(step=>step.prompt!==null).map(step=>step.domain))];
  const radar={};
  for(const domain of domains) radar[domain]=await discoverPrivateDomain(domain,{fetchImpl,now});
  return {...draft,toolDiscovery:{schema:'GROWTH_TOOL_DISCOVERY@1',scope:'PRIVATE_OPERATOR',metadataOnly:true,automaticInstall:false,commercialRights:'NOT_PROVEN',externalMetadataReadAttempts:domains.reduce((n,d)=>n+radar[d].topics.length+1,0),byDomain:radar},steps:draft.steps.map(step=>step.prompt===null?step:{...step,toolDiscoveryDomain:step.domain,toolDiscoveryState:(radar[step.domain].topics.some(t=>t.status==='METADATA_OBSERVED')||radar[step.domain].registry.status==='METADATA_OBSERVED')?'REVIEW_REQUIRED':'NOT_PROVEN'})};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  if(process.argv.length!==3||process.argv[2]!=='--private-tool-discovery')throw Error('PRIVATE_DISCOVERY_ARGUMENT_INVALID');
  const bytes=Buffer.alloc(48001);let n=0;
  while(n<bytes.length){const read=readSync(0,bytes,n,bytes.length-n,null);if(!read)break;n+=read;}
  if(n===bytes.length)throw Error('SOURCE_INVALID');
  const registry=JSON.parse(readFileSync(new URL('../../.agents/skills/registry.json',import.meta.url),'utf8'));
  const output=await buildPrivateNextRoundDrafts(bytes.subarray(0,n).toString('utf8'),registry);
  process.stdout.write(JSON.stringify(output)+'\n');
}
