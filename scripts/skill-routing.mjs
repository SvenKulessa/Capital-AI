import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const defaultRegistry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url), 'utf8'));

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
function selectSkillPlan(task, { domain, registry = defaultRegistry } = {}) {
  const specialists = selectSpecialists(task, { domain, registry });
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
  const primary = registry.domains[domain];
  const skills = [...new Set([primary.engineering, primary.advisory,
    ...extra.map(x => x.skill), ...specialists.skills, primary.presentation])];
  return {
    ...specialists,
    status: extra.length || specialists.skills.length ? 'MATCHED' : 'REVIEW_REQUIRED',
    agent: primary.chatAgent,
    skills,
    skillFiles: skills.map(skill => `.agents/skills/${skill}/SKILL.md`),
    matchedSignals: [...extra, ...specialists.matchedSignals],
    scope: 'ADVISORY_SKILL_PLAN_NO_EXECUTION_OR_AUTHORIZATION',
  };
}

export { normalizeSkillText, selectSpecialists, selectSkillPlan };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/skill-routing.mjs [--plan] [--domain PRODUCT|MARKET|PLATFORM|TRUST|GROWTH] <Aufgabentext>\n');
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
      const task = args.join(' ').trim();
      if (!task) throw new TypeError('Aufgabentext fehlt');
      process.stdout.write(JSON.stringify((plan ? selectSkillPlan : selectSpecialists)(task, { domain, registry: defaultRegistry }), null, 2) + '\n');
    } catch (error) {
      process.stderr.write(error.message + '\n');
      process.exitCode = 2;
    }
  }
}
