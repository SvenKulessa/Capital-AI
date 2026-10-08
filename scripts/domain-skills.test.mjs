import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const registry = JSON.parse(read('.agents/skills/registry.json'));
const expected = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];

const frontmatter = (file) => {
  const match = /^---\\n([\\s\\S]*?)\\n---\\n/.exec(file);
  assert.ok(match, 'SKILL.md must have frontmatter');
  const lines = Object.fromEntries(match[1].split('\\n').filter(Boolean).map(line => {
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
      assert.match(markdown, /AGENTS\\.md/);
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
