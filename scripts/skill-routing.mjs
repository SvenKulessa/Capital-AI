import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { skillSourceAudit } from './skill-bundles.mjs';
import { advisoryTopology } from '../shared/domain-advisory-routing.mjs';

const defaultRegistry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url), 'utf8'));


const resumeCommand = /^(?:SOLO2[ \t]+)?\/resume(?=$|[ \t\r\n·])/i;
const resumePhases = Object.freeze(["CONTEXT_RECOVERY","GOVERNANCE_SYNC","RAG_RETRIEVAL","TASK_CONSOLIDATION","LANGGRAPH_ROUTING","RESEARCH_DECISION","ARCHITECTURE_IMPLEMENTATION","TRUST_QUALITY_TESTS","CI_MERGE_EXISTING_DEPLOY_READBACK","COMMERCIAL_READINESS","EVIDENCE_CHECKPOINT","RETROBENCHMARK","ADAPTIVE_PROMPT","RESUME_OR_STOP"]);
const resumeProfile = Object.freeze({"schema":"CAPITAL_AI_ADAPTIVE_CHAT_RESUME@1","command":"/resume","kind":"NON_AUTHORIZING_CONTEXT","masterPrompt":".ai/prompts/000-execution-first.prompt.md","authority":"AGENTS.md","skillRouter":"scripts/skill-routing.mjs","domainLoop":"solo2DomainLoop","permissionExpansion":false,"runtimeActivation":"NOT_PROVEN"});

// Only an explicit leading chat command selects this non-executing route.
// A caller must recover trusted chat context and revalidate authority before
// handing any task to the existing LangGraph or RAG adapters.
function selectResumeRoute(task, { domain, app } = {}) {
  if (typeof task !== 'string' || task.length > 8192) {
    throw new TypeError('task must be a string of at most 8192 characters');
  }
  const match = resumeCommand.exec(task.trim());
  if (!match) return null;
  if (domain !== undefined && !Object.hasOwn(defaultRegistry.domains, domain)) {
    throw new RangeError('unknown primary domain');
  }
  const profile = app ?? JSON.parse(readFileSync(new URL('../.agents/app.prompt.json', import.meta.url), 'utf8'));
  const route = profile.resumeRouting;
  const loop = profile.solo2DomainLoop;
  if (profile.authority?.source !== 'AGENTS.md' ||
      profile.authority?.permissionExpansion !== false ||
      loop?.permissionExpansion !== false ||
      loop?.orchestrator !== 'scripts/growth-agent/auto_loop.py' ||
      loop?.offlineResearch !== 'scripts/growth-agent/agent_platform.py' ||
      loop?.durableCheckpoints !== 'scripts/growth-agent/checkpoint_store.py' ||
      !route || Object.keys(route).length !== Object.keys(resumeProfile).length + 1 ||
      Object.entries(resumeProfile).some(([key, value]) => route[key] !== value) ||
      !Array.isArray(route.phases) || route.phases.length !== resumePhases.length ||
      resumePhases.some((phase, index) => route.phases[index] !== phase)) {
    throw new TypeError('invalid non-authorizing resume route');
  }
  return {
    ...resumeProfile, phases: [...resumePhases],
    primaryDomain: domain ?? null,
    status: 'CONTEXT_REVALIDATION_REQUIRED',
    contextRequired: true,
    orchestrator: loop.orchestrator,
    offlineResearch: loop.offlineResearch,
    durableCheckpoints: loop.durableCheckpoints,
    executionStarted: false,
    scope: 'ADVISORY_RESUME_ROUTE_NO_EXECUTION_OR_AUTHORIZATION'
  };
}

function normalizeSkillText(value) {
  return value.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function selectSpecialists(task, { domain, registry } = {}) {
  if (typeof task !== 'string' || task.length > 8192) {
    throw new TypeError('task must be a string of at most 8192 characters');
  }
  if (!registry || !Array.isArray(registry.sharedSkills?.specialists)
      || !registry.specialistRouting || registry.specialistRouting.version !== 'CAPITAL_AI_SPECIALIST_ROUTING@1') {
    throw new TypeError('invalid specialist routing registry');
  }
  if (domain !== undefined && !Object.hasOwn(registry.domains, domain)) {
    throw new RangeError('unknown primary domain');
  }
  const ids = registry.sharedSkills.specialists;
  const signalMap = registry.specialistRouting.signals;
  if (!signalMap || Object.keys(signalMap).length !== ids.length
      || Object.keys(signalMap).some(id => !ids.includes(id))) {
    throw new TypeError('specialist signals must match the shared registry');
  }
  const padded = ` ${normalizeSkillText(task)} `;
  const matched = ids.map((skill, index) => {
    const triggers = signalMap[skill];
    if (!Array.isArray(triggers) || !triggers.length
        || triggers.some(signal => typeof signal !== 'string' || !normalizeSkillText(signal))) {
      throw new TypeError(`invalid signals for ${skill}`);
    }
    return { skill, index, signals: [...new Set(triggers)].filter(signal =>
      padded.includes(` ${normalizeSkillText(signal)} `)) };
  }).filter(entry => entry.signals.length)
    .sort((a, b) => b.signals.length - a.signals.length || a.index - b.index);
  return {
    status: matched.length ? 'MATCHED' : 'REVIEW_REQUIRED',
    primaryDomain: domain ?? null,
    skills: matched.map(entry => entry.skill),
    matchedSignals: matched.map(({ skill, signals }) => ({ skill, signals })),
    scope: 'DETERMINISTIC_TEXT_SIGNALS_ONLY'
  };
}

// Advisory plan only: no agent spawning, tool calls or permission changes.
function selectSkillPlan(task, { domain, relatedDomains = [], registry = defaultRegistry, asOf } = {}) {
  const specialists = selectSpecialists(task, { domain, registry });
  const resumeRoute = selectResumeRoute(task, { domain });
  if (!domain) throw new RangeError('primary domain required for a skill plan');
  const routing = registry.taskSkillRouting;
  if (routing?.version !== 'CAPITAL_AI_TASK_SKILL_ROUTING@1' || !routing.signals ||
      typeof routing.signals !== 'object' || Array.isArray(routing.signals)) {
    throw new TypeError('invalid task skill routing registry');
  }
  const padded = ` ${normalizeSkillText(task)} `;
  const extra = [];
  for (const [skill, signals] of Object.entries(routing.signals)) {
    const owner = registry.skillGovernance?.[skill]?.domainOwner;
    if (!registry.domains[owner]?.ownedSkills?.includes(skill) ||
        !Array.isArray(signals) || !signals.length || signals.some(s => typeof s !== 'string' || !normalizeSkillText(s))) {
      throw new TypeError(`invalid task skill: ${skill}`);
    }
    const matched = signals.filter(s => padded.includes(` ${normalizeSkillText(s)} `));
    if (matched.length) extra.push({ skill, signals: matched });
  }
  if (!Array.isArray(relatedDomains) || relatedDomains.length > 4 ||
      new Set(relatedDomains).size !== relatedDomains.length ||
      relatedDomains.some(id => typeof id !== 'string' || id === domain || !Object.hasOwn(registry.domains, id))) {
    throw new RangeError('invalid related advisory domains');
  }
  const topology = registry.advisoryRouting ? advisoryTopology(registry) : [];
  const matchedDomains = topology.filter(({ id }) => id !== domain &&
    registry.advisoryRouting.domains[id].signals.some(signal => padded.includes(' ' + normalizeSkillText(signal) + ' ')))
    .map(({ id }) => id);
  const advisoryDomains = [...new Set([domain, ...relatedDomains, ...matchedDomains])];
  const primary = registry.domains[domain];
  const skills = [...new Set([primary.engineering, primary.advisory,
    ...advisoryDomains.slice(1).map(id => registry.domains[id].advisory),
    ...extra.map(x => x.skill), ...specialists.skills, primary.presentation])];
  const sourceReviews = registry.skillSourceInventory
    ? skillSourceAudit(registry, asOf).skills.filter(skill => skills.includes(skill.id))
    : undefined;
  return {
    ...specialists,
    ...(resumeRoute ? { resumeRoute } : {}),
    ...(sourceReviews ? { sourceReviews } : {}),
    status: extra.length || specialists.skills.length || advisoryDomains.length > 1 ? 'MATCHED' : 'REVIEW_REQUIRED',
    advisoryDomains,
    advisoryTracks: advisoryDomains.flatMap(id => topology.filter(profile => profile.id === id)),
    agent: primary.chatAgent,
    skills,
    skillFiles: skills.map(skill => `.agents/skills/${skill}/SKILL.md`),
    matchedSignals: [...extra, ...specialists.matchedSignals],
    scope: 'ADVISORY_SKILL_PLAN_NO_EXECUTION_OR_AUTHORIZATION',
  };
}

export { normalizeSkillText, selectSpecialists, selectSkillPlan, selectResumeRoute };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/skill-routing.mjs [--plan] [--domain PRODUCT|MARKET|PLATFORM|TRUST|GROWTH] [--related MARKET,TRUST] <Aufgabentext>\n');
  } else {
    const planIndex = args.indexOf('--plan');
    const plan = planIndex !== -1;
    if (plan) args.splice(planIndex, 1);
    const domainIndex = args.indexOf('--domain');
    let domain;
    if (domainIndex !== -1) {
      domain = args[domainIndex + 1];
      args.splice(domainIndex, 2);
    }
    try {
      const relatedIndex = args.indexOf('--related');
      let relatedDomains = [];
      if (relatedIndex !== -1) {
        if (!plan || !args[relatedIndex + 1]) throw new TypeError('--related requires --plan and a domain list');
        relatedDomains = args[relatedIndex + 1].split(',');
        args.splice(relatedIndex, 2);
      }
      const task = args.join(' ').trim();
      if (!task) throw new TypeError('Aufgabentext fehlt');
      const resume = selectResumeRoute(task, { domain });
      if (resume && (!plan || !domain)) {
        process.stdout.write(JSON.stringify(resume, null, 2) + '\n');
      } else {
        process.stdout.write(JSON.stringify((plan ? selectSkillPlan : selectSpecialists)(task, { domain, relatedDomains, registry: defaultRegistry }), null, 2) + '\n');
      }
    } catch (error) {
      process.stderr.write(error.message + '\n');
      process.exitCode = 2;
    }
  }
}
