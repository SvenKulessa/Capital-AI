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
  assert.match(policy, /SOLO_MAINTAINER_FLOW@1/);
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
