/** Deterministic, non-authorizing follow-up prompts for CAPITAL-AI's first-party chat windows. */
import skillRegistry from '../../.agents/skills/registry.json' with { type: 'json' };

export type ChatDomain = 'PRODUCT' | 'MARKET' | 'PLATFORM' | 'TRUST' | 'GROWTH';
export type ChatFollowUp = {
  id: 'execute' | 'audit' | 'verify';
  label: string;
  prompt: string;
  skills: string[];
  domain: ChatDomain;
};

const DOMAINS: ChatDomain[] = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];
const DOMAIN_SIGNALS: Record<ChatDomain, RegExp> = {
  TRUST: /\b(?:security|sicherheit|cve|vulnerability|ds-0026|dsgvo|datenschutz|oauth|secrets?|licen[cs]e|lizenz|tenant|rls|isolation)\b/i,
  PLATFORM: /\b(?:render|docker|oci|buildkit|deploy|github|pull request|pr #[0-9]+|ci|codeql|infrastruktur|cloud|langgraph)\b/i,
  GROWTH: /\b(?:social|content engine|content studio|instagram|youtube|twitter|x-post|kampagne|marketing|seo|ga4|werbung|lead|attribution|podcast)\b/i,
  MARKET: /\b(?:crypto|krypto|trading|markt|screener|aktien|portfolio|forex|signals?|backtest|buffett|fintech)\b/i,
  PRODUCT: /\b(?:chat|darstellung|layout|ui|ux|button|kopieren|copy|screenreader|barrierefrei|frontend|profil|app)\b/i,
};

function normalize(value: string): string {
  return value.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function redactTask(input: string): string {
  // A last-resort copy boundary; never claim this is a complete DLP/PII scanner.
  return input
    .replace(/(?:github_pat_[a-z0-9_]{15,}|gh[pousr]_[a-z0-9_]{8,}|sk-(?:proj-)?[a-z0-9_-]{8,}|sk_(?:live|test)_[a-z0-9]{8,}|AIza[a-z0-9_-]{20,}|xox[baprs]-[a-z0-9-]{10,}|AKIA[A-Z0-9]{16})/gi, '[SECRET_ENTFERNT]')
    .replace(/\b(bearer\s+)[a-z0-9_.~+/-]{12,}/gi, '$1[SECRET_ENTFERNT]')
    .replace(/((?:password|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?key|private[_-]?key)\s*[:=]\s*)[^\s,;]+/gi, '$1[SECRET_ENTFERNT]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim().slice(0, 700);
}
function signals(task: string, entries: Record<string, string[]>): string[] {
  const padded = ' ' + normalize(task) + ' ';
  return Object.entries(entries).map(([skill, patterns]) => ({
    skill, score: patterns.filter(pattern => padded.includes(' ' + normalize(pattern) + ' ')).length,
  })).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill))
    .map(item => item.skill);
}
export function classifyChatDomain(task: string, hint?: ChatDomain): ChatDomain {
  if (hint && DOMAINS.includes(hint)) return hint;
  // Security INCIDENTS remain TRUST; an incidental OAuth mention must not hijack a
  // campaign, and incidental GitHub/CI mentions must not hijack a chat UI repair.
  if (/\b(?:tenant\s+isolation|oauth\s+(?:attack|fehler|schwachstelle|csrf)|security\s+incident|sicherheitsvorfall|secret\s+leak|datenpanne|cve-\d|prompt\s+injection)\b/i.test(task)) return 'TRUST';
  if (/\b(?:chatfenster|chat\s*(?:ui|layout|button)|copy\s*button|clipboard|kopier\w*|screenreader|darstellungsfehler|responsive\s+chat)\b/i.test(task)) return 'PRODUCT';
  if (DOMAIN_SIGNALS.GROWTH.test(task) || isXCampaign(task) || /\b(?:b2b|lead\s*funnel|leadgen|monetarisierung)\b/i.test(task)) return 'GROWTH';
  for (const domain of ['TRUST', 'PLATFORM', 'MARKET', 'PRODUCT'] as ChatDomain[]) {
    if (DOMAIN_SIGNALS[domain].test(task)) return domain;
  }
  return 'PRODUCT';
}
function isXCampaign(task: string): boolean {
  return /\b(?:twitter|x[-\s](?:post|kampagne|account)|(?:auf|bei|fuer|für)\s+x\b|x\s+veröffentlichen)\b/i.test(task);
}

/**
 * Prompts only. No skill execution, app connection, privileged command or publishing is performed.
 * All skill paths are taken from the canonical .agents/skills/registry.json.
 */
export function buildChatFollowUps(input: string, hint?: ChatDomain): ChatFollowUp[] {
  if (typeof input !== 'string' || !input.trim()) return [];
  const task = redactTask(input);
  if (!task) return [];
  const domain = classifyChatDomain(task, hint);
  const owner = skillRegistry.domains[domain];
  const registered = skillRegistry.skillGovernance as Record<string, { domainOwner: string }>;
  const taskSkills = signals(task, skillRegistry.taskSkillRouting.signals);
  const specialists = signals(task, skillRegistry.specialistRouting.signals).slice(0, 3);
  const skills = [...new Set([owner.engineering, owner.advisory, ...taskSkills, ...specialists, owner.presentation])]
    .filter(skill => Object.hasOwn(registered, skill));
  const files = skills.map(skill => '.agents/skills/' + skill + '/SKILL.md');
  const b2b = /\b(?:b2b|lead\s*funnel|leadgen|monetarisierung|enterprise\s+sales)\b/i.test(task);
  const channels = [
    /\binstagram\b/i.test(task) ? 'INSTAGRAM: Asset-Formate, Bildrechte, Consent/UTM und tatsächlich verfügbare Account-Rechte prüfen; als Entwurf belassen.' : '',
    isXCampaign(task) ? 'X: Text, URL-Kontext, hashgebundene Assets, Owner-OAuth, API-Kosten, idempotente Zustellung und Publisher-Receipt prüfen; ohne Rechte/Approval nicht veröffentlichen.' : '',
    /\byoutube\b/i.test(task) ? 'YOUTUBE: OAuth-Scopes, Video-/Audio-/Untertitelrechte, Private-Upload und Veröffentlichung separat prüfen; keinen öffentlichen Upload aus dem Prompt auslösen.' : '',
    b2b ? 'B2B: serverseitige Lead-Validierung, Consent, Rate-Limits, Tenant-Isolation, belastbare SKU/Stripe-Kosten und GA4-Attribution nach Opt-in prüfen.' : '',
  ].filter(Boolean);
  const social = DOMAIN_SIGNALS.GROWTH.test(task) && /\b(?:social|content engine|content studio|instagram|youtube|twitter|x-post|kampagne|marketing|podcast|werbung|lead)\b/i.test(task)
    || isXCampaign(task) || b2b;
  const socialClause = social
    ? ' Nutze bestehende Contracts src/contracts/contentSocialPackage.ts, src/contracts/socialPublisherAdapter.ts und die Social Content Engine in src/platform/SocialMediaEngine sowie server/social-media/provider-adapter.mjs. Plane fachlich Draft → Review → Asset-Provenance/SHA-256 und Rechte → Owner-Approval → Adapter-Readiness → kontrollierte Zustellung → consented Attribution. Behandle diese Planung NICHT als Runtime-Zustandsnachweis: aktuell veröffentlichen ausschließlich separat autorisierte Providerpfade. Prüfe reale Verfügbarkeit der Social-/Marketing-Apps (z.B. Metricool, Supermetrics oder Ads Manager) vor Nutzung und behaupte nie eine Verbindung oder einen Post ohne Provider-Receipt. ' + channels.join(' ') + ' Voraussetzung für jeden späteren Public-Publish: kein ungeprüftes Publishing.'
    : '';
  const council = 'Multi-Agent-Rat: ORCHESTRATOR/' + domain + ', TRUST/SECURITY, QUALITY und – falls fachlich erforderlich – PLATFORM, PRODUCT, MARKET oder GROWTH. Alle Rollen besitzen nur tatsächlich verfügbare Toolrechte. ';
  const orchestration = 'Nutze die bestehende LangGraph-Referenz scripts/growth-agent/auto_loop.py mit ANALYZED → IMPLEMENTED → TESTED → MERGE_READY → MERGED → DEPLOYED → VERIFIED und höchstens zwei begründeten Reparaturschleifen. Für reine Prüfaufträge bleibt der Ablauf read-only. ';
  const source = 'Prüfe aktuelle Root-AGENTS.md (SOLO_MAINTAINER_FLOW@2) sowie diese registrierten Skills nach fachlicher Relevanz: ' + files.join(', ') + '. Verwende nur tatsächlich installierte/verbundene Apps und Connectoren; keine angenommenen Berechtigungen. ';
  const limits = 'Keine neuen Kosten, Credentials, produktiven Datenmutationen, Rechtefreigaben oder Veröffentlichungen ohne erforderliche Autorisierung. Kein Merge ohne aktuellen Head/Main, GitHub-Rulesets, Docker Security Gate und Domain Governance. Berichte echte SHAs, Run-IDs, Exit-Codes und VERIFIED/BLOCKED/NOT_PROVEN.';
  const taskLine = 'Aufgabe: ' + task + '. ';
  const readonlyNoun = /\b(?:implement|bau|entwickel|integrier|erstell)\w*\s+(?:(?:einen|eine|das|den|neuen|sicheren)\s+){0,2}read[- ]?only\s+(?:adapter|client|connector|service|datenzugang|schnittstelle)\b/i.test(task);
  const explicitReadOnly = /\bnur\s+(?:lesend|pr[üu]fen|analysieren|ansehen|auditieren)\b|\bkeine\s+(?:code[ -]?)?(?:[äa]nderungen|mutationen)\b|\bnicht\s+(?:implementieren|reparieren|[äa]ndern)\b/i.test(task);
  const readOnly = explicitReadOnly || (/\bread[- ]?only\b/i.test(task) && !readonlyNoun);
  const engineering = !readOnly && /\b(?:implement|reparier|beheb|fix|integrier|deploy|merge|entwickel|erstell|ändere|aendere)\w*/i.test(task);
  const execution = readOnly
    ? 'Untersuche ausschließlich read-only und dokumentiere reproduzierbare Befunde, CI, Risiken und den kleinsten autorisierbaren Reparaturvorschlag; keine Änderungen, Merges oder Deployments. '
    : engineering
      ? 'Reproduziere den konkreten Fehler, implementiere den kleinsten sicheren Fix im bestehenden Scope, führe Negativtests und vorhandene CI durch; bei belegter Mergefreigabe regulär squash-mergen. '
      : 'Analysiere zuerst den konkreten Bedarf und liefere die kleinste fachlich richtige, nachprüfbare Umsetzung oder Erklärung; leite aus einer Frage keine Schreibfreigabe ab. ';
  const base = taskLine + source + council + orchestration + socialClause + ' ' + "GROWTH_TOOL_DISCOVERY@1: Suche bei der Ausführung aktiv nach aufgabenrelevanten externen Tools, Plugins und kommerziell nutzbaren Alternativen über tatsächlich verfügbare autorisierte Verzeichnisse und offizielle Quellen; vergleiche zuerst vorhandene Integrationen. Verwende ausschließlich nicht vertrauliche Suchbegriffe. Dokumentiere Quelle, Zeitpunkt, Zweck, Version, Kosten, Datenschutz, kommerzielle Nutzungs-, Weitergabe- und Outputrechte sowie Verbindungs-/Runtime-Status getrennt im vorhandenen Owner-Anwendungskatalog. Fehlt eine Suchquelle oder belastbare Rechte-Evidence, kennzeichne dies NOT_PROVEN; keine automatische Installation, Freigabe, Veröffentlichung oder Kostenaktivierung. ";
  return [
    { id: 'execute', label: readOnly ? 'Read-only prüfen und belegen' : engineering ? 'Fehler beheben und validieren' : 'Aufgabe strukturiert ausführen',
      prompt: base + execution + limits, skills, domain },
    { id: 'audit', label: 'Unabhängige Qualitätsprüfung',
      prompt: base + 'Prüfe ausschließlich read-only Risiken, Accessibility und Trust Boundaries, tatsächliche CI/CodeQL-/Runtime-Evidence sowie fehlende Nachweise; keine Mutationen, Merges oder Deployments. ' + limits, skills, domain },
    { id: 'verify', label: social ? 'Social-Engine-Entwurf und Wirkung' : 'Integration und Wirkung prüfen',
      prompt: base + (social
        ? 'Erstelle einen rechtlich und fachlich prüfbaren Content-/Attribution-Entwurf für die bestehende Social Content Engine und benenne fehlende Owner-/Medien-/Kostenfreigaben. '
        : 'Prüfe Integration, Bedienbarkeit bei 320/390/1440 CSS-Pixeln, reale Wirkung und Recovery im bestehenden Produktpfad; trenne Demo von Live-Evidence. ')
        + limits, skills, domain },
  ];
}
