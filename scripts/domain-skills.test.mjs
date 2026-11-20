import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const registry = JSON.parse(read('.agents/skills/registry.json'));
const expected = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];

const frontmatter = (file) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(file);
  assert.ok(match, 'SKILL.md must have frontmatter');
  const lines = Object.fromEntries(match[1].split('\n').filter(Boolean).map(line => {
    const i = line.indexOf(':');
    assert.ok(i > 0, 'invalid frontmatter line');
    return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, '')];
  }));
  return lines;
};

test('registry contains exactly five domains, two skills each, and one chat agent each', () => {
  assert.equal(registry.schemaVersion, 'CAPITAL_AI_DOMAIN_SKILLS@1');
  assert.equal(registry.authority, 'AGENTS.md');
  assert.equal(registry.contract, 'SOLO_MAINTAINER_FLOW@2');
  assert.deepEqual(Object.keys(registry.domains).sort(), [...expected].sort());
  const ids = new Set();
  for (const domain of expected) {
    const entry = registry.domains[domain];
    for (const kind of ['engineering', 'advisory']) {
      const name = entry[kind];
      assert.match(name, /^[a-z0-9]+-(engineering|advisory)$/);
      assert.equal(name, `${domain.toLowerCase()}-${kind}`);
      assert.ok(!ids.has(name), 'duplicate skill'); ids.add(name);
      const markdown = read(`.agents/skills/${name}/SKILL.md`);
      const metadata = frontmatter(markdown);
      assert.equal(metadata.name, name);
      assert.ok(metadata.description.length > 40 && metadata.description.length <= 1024);
      assert.match(markdown, /AGENTS\.md/);
      assert.match(markdown, /NOT_VERIFIED/);
    }
    assert.equal(entry.chatAgent, `.github/agents/capital-ai-${domain.toLowerCase()}.agent.md`);
    const agent = read(entry.chatAgent);
    assert.ok(agent.includes(`.agents/skills/${entry.engineering}/SKILL.md`));
    assert.ok(agent.includes(`.agents/skills/${entry.advisory}/SKILL.md`));
  }
  assert.equal(ids.size, 10);
});

test('one root policy and chat integrations describe skill routing without authorizing new gates', () => {
  const policy = read('AGENTS.md');
  const copilot = read('.github/copilot-instructions.md');
  assert.match(policy, /SOLO_MAINTAINER_FLOW@2/);
  assert.match(policy, /Domain Skills und beratende Fähigkeiten im Chat/);
  assert.match(policy, /\.agents\/skills\/registry\.json/);
  assert.match(copilot, /AGENTS\.md/);
  assert.match(copilot, /\.agents\/skills\/registry\.json/);
  assert.match(copilot, /no gates/i);
});

test('ChatGPT plugin discovery is contextual, least-privileged and non-blocking', () => {
  const policy = read('AGENTS.md');
  assert.match(policy, /## ChatGPT-Plugin-Discovery und Tool-Nutzung/);
  assert.match(policy, /bereits installiertes und verbundenes ChatGPT-Plugin/);
  assert.match(policy, /direkt nutzen/);
  assert.match(policy, /Plugin-Suche/);
  assert.match(policy, /freiwilligen/);
  assert.match(policy, /NOT_PROVEN/);
  assert.match(policy, /Least Privilege/);
  assert.match(policy, /keine neuen CI-Checks/);
  for (const domain of expected) assert.match(policy, new RegExp(domain));
});

test('shared visual-chat skill is discoverable from every domain agent without inventing UI capabilities', () => {
  assert.equal(registry.sharedSkills.visualChat, 'visual-chat');
  const visual = read('.agents/skills/visual-chat/SKILL.md');
  const metadata = frontmatter(visual);
  assert.equal(metadata.name, 'visual-chat');
  assert.match(visual, /no gates/i);
  assert.match(visual, /Markdown/);
  assert.match(visual, /Mermaid/);
  assert.match(visual, /NOT_PROVEN/);
  assert.match(visual, /AGENTS\.md/);
  const root = read('AGENTS.md');
  const copilot = read('.github/copilot-instructions.md');
  assert.match(root, /## Einheitliche grafische Chat-Darstellung aller Domains/);
  assert.match(root, /keine ChatGPT-UI-Engine/);
  assert.match(copilot, /\.agents\/skills\/visual-chat\/SKILL\.md/);
  for (const domain of expected) {
    assert.equal(registry.domains[domain].presentation, registry.sharedSkills.visualChat);
    const agent = read(registry.domains[domain].chatAgent);
    assert.match(agent, /\.agents\/skills\/visual-chat\/SKILL\.md/);
  }
});

test('monetization assessment keeps license and runtime evidence separate', () => {
  const report = read('docs/business/MONETIZATION-DEEPSCAN-LEGAL-MATRIX-20261008.md');
  assert.match(report, /main@ed5c47611208ae4b145d110e03fb88657f51912c/);
  assert.match(report, /Massive/);
  assert.match(report, /MiCA/);
  assert.match(report, /GitHub Marketplace/);
  assert.match(report, /NOT_PROVEN/);
  assert.match(report, /Merge #288/);
  assert.match(report, /kein Live/);
  const ids = [...report.matchAll(/^\| (\d+) \|/gm)].map(row => Number(row[1]));
  assert.deepEqual(ids, Array.from({ length: 28 }, (_, i) => i + 1));
});


test('ten enterprise specialist skills are shared, discoverable and have bounded authority', () => {
  const specialists = ['ai-engineering', 'data-engineering', 'quant-research', 'customer-success',
    'sales-enterprise', 'legal-compliance', 'incident-response', 'analytics-intelligence',
    'mobile-engineering', 'accessibility-audit'];
  assert.deepEqual(registry.sharedSkills.specialists, specialists);
  assert.deepEqual(Object.keys(registry.specialistSkillMetadata), specialists);
  for (const id of specialists) {
    const meta = registry.specialistSkillMetadata[id];
    assert.ok(['high', 'medium'].includes(meta.priority));
    assert.ok(meta.leadDomains.length > 0 && meta.leadDomains.every(x => expected.includes(x)));
    const file = read(`.agents/skills/${id}/SKILL.md`);
    assert.equal(frontmatter(file).name, id);
    assert.ok(frontmatter(file).description.length > 40);
    assert.match(file, /AGENTS\.md/);
    assert.match(file, /SOLO_MAINTAINER_FLOW@2/);
    assert.match(file, /NOT_PROVEN/);
    assert.match(file, /keine zusätzlichen Required Checks/);
  }
  for (const domain of expected) {
    const entry = registry.domains[domain];
    assert.equal(entry.specialistAccess, 'shared');
    assert.ok(entry.recommendedSpecialists.length >= 3);
    assert.ok(entry.recommendedSpecialists.every(id => specialists.includes(id)));
    const agent = read(entry.chatAgent);
    assert.match(agent, /sharedSkills\.specialists/);
    assert.match(agent, /alle zehn Fach-Skills/);
    assert.match(agent, /Repository-Zugriff/);
  }
  assert.match(read('.github/copilot-instructions.md'), /sharedSkills\.specialists/);
  assert.match(read('AGENTS.md'), /Shared Enterprise Specialist Skills/);
});

test('machine-readable domain prompts are source-bound, scoped and discoverable', () => {
  assert.equal(registry.promptContracts.schema, 'CAPITAL_AI_PROMPT_CONTRACT_REFS@1');
  assert.equal(registry.promptContracts.application, '.agents/app.prompt.json');
  assert.equal(registry.promptContracts.authority, 'AGENTS.md');
  assert.deepEqual(Object.keys(registry.promptContracts.domains).sort(), [...expected].sort());
  const app = JSON.parse(read(registry.promptContracts.application));
  assert.equal(app.schema, 'CAPITAL_AI_APPLICATION_EXECUTION_PROMPT@1');
  assert.equal(app.authority.source, 'AGENTS.md');
  assert.equal(app.authority.contract, 'SOLO_MAINTAINER_FLOW@2');
  assert.equal(app.authority.permissionExpansion, false);
  assert.deepEqual(app.domainPrompts, registry.promptContracts.domains);
  assert.equal(app.multiAgent.singlePermissionContext, true);
  assert.equal(app.multiAgent.serializedWrites, true);
  assert.equal(app.metrics.noInventedGains, true);
  assert.ok(app.constraints.includes('NO_RULESET_BYPASS'));
  const validate = (candidate, domain) => {
    assert.equal(candidate.schema, 'CAPITAL_AI_DOMAIN_EXECUTION_PROMPT@1');
    assert.equal(candidate.domain, domain);
    assert.equal(candidate.projectFolder, 'CAPITAL-AI-' + domain);
    assert.equal(candidate.authority.source, 'AGENTS.md');
    assert.equal(candidate.authority.contract, 'SOLO_MAINTAINER_FLOW@2');
    assert.equal(candidate.authority.type, 'NON_AUTHORIZING_CONTEXT');
    assert.equal(candidate.authority.permissionExpansion, false);
    assert.equal(candidate.skillRegistry, '.agents/skills/registry.json');
    assert.equal(candidate.engineeringSkill, registry.domains[domain].engineering);
    assert.equal(candidate.advisorySkill, registry.domains[domain].advisory);
    assert.equal(candidate.chatAgent, registry.domains[domain].chatAgent);
    assert.equal(candidate.efficiency.maxDistinctRepairAttempts, 2);
    assert.equal(candidate.efficiency.oneActiveMutatingScope, true);
    assert.ok(candidate.prompt.includes('AGENTS.md'));
    assert.ok(candidate.trustBoundary.rightsCannotBeInferredFromCI);
    assert.ok(candidate.trustBoundary.productionMutationRequiresScopedEvidence);
  };
  for (const domain of expected) {
    const file = registry.promptContracts.domains[domain];
    assert.equal(file, 'CAPITAL-AI-' + domain + '/domain.prompt.json');
    const prompt = JSON.parse(read(file));
    validate(prompt, domain);
    const doc = read('CAPITAL-AI-' + domain + '/PROJECT.md');
    assert.match(doc, /SOLO_MAINTAINER_FLOW@2/);
    assert.doesNotMatch(doc, /SOLO_MAINTAINER_FLOW@1/);
    assert.ok(doc.includes(file));
    for (const [field,value] of [
      ['authority', { ...prompt.authority, permissionExpansion: true }],
      ['domain', 'OTHER'],
      ['engineeringSkill', 'non-existent-engineering'],
      ['efficiency', { ...prompt.efficiency, maxDistinctRepairAttempts: 99 }],
    ]) assert.throws(() => validate({ ...prompt, [field]: value }, domain));
  }
});

test('Docker build includes only the prompt validation inputs, with no broad context expansion', () => {
  const docker = read('Dockerfile');
  const ignore = read('.dockerignore');
  assert.ok(docker.includes('COPY .agents/app.prompt.json ./.agents/app.prompt.json'));
  assert.ok(ignore.split('\n').includes('!.agents/app.prompt.json'));
  for (const domain of expected) {
    const folder = 'CAPITAL-AI-' + domain;
    const copy = 'COPY ' + folder + '/domain.prompt.json ' + folder + '/PROJECT.md ./' + folder + '/';
    assert.ok(docker.includes(copy), 'missing build-only prompt copy: ' + folder);
    assert.ok(ignore.split('\n').includes('!' + folder + '/domain.prompt.json'));
    assert.ok(ignore.split('\n').includes('!' + folder + '/PROJECT.md'));
  }
  assert.doesNotMatch(docker, /^COPY \.agents\/ \.\/\.agents\/$/m);
  assert.doesNotMatch(ignore, /^!\.agents\/\*\*$/m);
});
